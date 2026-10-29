import type { PaynowCheckoutRequest } from "@goal4me/schemas";
import type { PlanId } from "@goal4me/schemas";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { UserFacingError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import { storeBilling } from "./purchases";

/**
 * Premium status and PayNow payments. The entitlement row is written only by
 * Edge Functions; the app just reads it (RLS: own row only).
 */
export const billingKeys = {
  premium: (userId: string) => ["premium", userId] as const,
  payment: (reference: string) => ["paynow-payment", reference] as const,
};

/**
 * Content the database hides from free users (locked workout days, premium
 * lessons) is cached as "empty". When premium status changes, those caches
 * are stale, so refetch them.
 */
function refreshGatedContent(client: QueryClient) {
  void client.invalidateQueries({ queryKey: ["program-day"] });
  void client.invalidateQueries({ queryKey: ["lesson"] });
  void client.invalidateQueries({ predicate: (q) => q.queryKey.includes("lessons") });
}

export interface PremiumStatus {
  isPremium: boolean;
  expiresAt: string | null;
  store: string | null;
}

async function fetchPremium(client: QueryClient, userId: string): Promise<PremiumStatus> {
  const { data, error } = await getSupabase()
    .from("entitlements")
    .select("is_active, expires_at, store")
    .eq("user_id", userId)
    .eq("entitlement", "premium")
    .maybeSingle();
  if (error) throw error;
  const active =
    !!data?.is_active && (data.expires_at === null || Date.parse(data.expires_at) > Date.now());
  const previous = client.getQueryData<PremiumStatus>(billingKeys.premium(userId));
  if (previous && previous.isPremium !== active) refreshGatedContent(client);
  return { isPremium: active, expiresAt: data?.expires_at ?? null, store: data?.store ?? null };
}

export function usePremium(userId: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: billingKeys.premium(userId),
    queryFn: () => fetchPremium(client, userId),
    // A subscription can lapse while the app is open; recheck every 10 minutes.
    staleTime: 10 * 60 * 1000,
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Store purchases reach our database through RevenueCat's webhook, a few
 * seconds after the store confirms. Poll until premium shows up (about 30 s).
 */
async function waitForPremium(client: QueryClient, userId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const status = await client.fetchQuery({
      queryKey: billingKeys.premium(userId),
      queryFn: () => fetchPremium(client, userId),
      staleTime: 0,
    });
    if (status.isPremium) return true;
    await sleep(2000);
  }
  return false;
}

/** Localised store prices (native only). Not persisted: prices follow the store. */
export function useStorePlans(userId: string) {
  return useQuery({
    queryKey: ["store-plans", userId],
    enabled: storeBilling.available,
    meta: { persist: false },
    staleTime: 60 * 60 * 1000,
    queryFn: () => storeBilling.getPlans(userId),
  });
}

/** Result of a store purchase or restore, as the paywall shows it. */
export type StoreResult = "premium" | "cancelled" | "pending" | "nothing_to_restore";

export function useStorePurchase(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (planId: PlanId): Promise<StoreResult> => {
      const outcome = await storeBilling.purchase(userId, planId);
      if (outcome === "cancelled") return "cancelled";
      return (await waitForPremium(client, userId)) ? "premium" : "pending";
    },
  });
}

export function useRestorePurchases(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<StoreResult> => {
      if (!(await storeBilling.restore(userId))) return "nothing_to_restore";
      return (await waitForPremium(client, userId)) ? "premium" : "pending";
    },
  });
}

/** True only once we know the user is premium; unknown (loading/offline) counts as free. */
export function useIsPremium(userId: string): boolean {
  return usePremium(userId).data?.isPremium ?? false;
}

export interface CheckoutResult {
  reference: string;
  /** PayNow's hosted payment page (web checkout). */
  redirectUrl: string | null;
  /** What to tell the user for mobile money ("dial *151# …"). */
  instructions: string | null;
}

/** Edge Function errors carry a friendly message in the JSON body. */
async function functionError(error: unknown): Promise<Error> {
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === "function") {
    try {
      const body = (await context.json()) as { message?: string };
      if (body.message) return new UserFacingError(body.message);
    } catch {
      // Fall through to the generic error below.
    }
  }
  return error instanceof Error ? error : new Error("Payment could not be started");
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: async (input: PaynowCheckoutRequest): Promise<CheckoutResult> => {
      const { data, error } = await getSupabase().functions.invoke<CheckoutResult>(
        "paynow-checkout",
        { body: input },
      );
      if (error) throw await functionError(error);
      if (!data) throw new Error("Payment could not be started");
      return data;
    },
  });
}

export interface PaymentStatusResult {
  status: string;
  paid: boolean;
}

const MAX_STATUS_POLLS = 150;
const FINAL_FAILURES = ["cancelled", "failed", "disputed", "refunded"];
export const isFinalFailure = (status: string | undefined): boolean =>
  !!status && FINAL_FAILURES.includes(status);

/**
 * Polls PayNow (through our Edge Function) every 4 s until the payment is
 * paid or has definitely failed. When paid, premium is refreshed everywhere.
 */
export function usePaymentStatus(userId: string, reference: string | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: billingKeys.payment(reference ?? ""),
    enabled: !!reference,
    meta: { persist: false },
    queryFn: async (): Promise<PaymentStatusResult> => {
      const { data, error } = await getSupabase().functions.invoke<PaymentStatusResult>(
        "paynow-status",
        { body: { reference } },
      );
      if (error) throw await functionError(error);
      if (!data) throw new Error("No payment status");
      if (data.paid) await client.invalidateQueries({ queryKey: billingKeys.premium(userId) });
      return data;
    },
    // Stop after ~10 minutes: PayNow's own callback still unlocks premium later.
    refetchInterval: (query) => {
      const status = query.state.data;
      const done = status?.paid || isFinalFailure(status?.status);
      return done || query.state.dataUpdateCount >= MAX_STATUS_POLLS ? false : 4000;
    },
  });
}
