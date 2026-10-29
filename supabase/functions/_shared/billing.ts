import type { SupabaseClient } from "@supabase/supabase-js";
import { type EntitlementState, extensionStart, grant } from "./entitlements.ts";
import {
  amountToMinor,
  field,
  PAID_STATUSES,
  parseMessage,
  type PaymentStatus,
  toPaymentStatus,
  verifyMessage,
} from "./paynow.ts";
import { addPeriod, isPlanId, PLANS } from "./plans.ts";

/** Storage operations the billing flow needs; the Supabase version is below, tests use a fake. */
export interface BillingStore {
  paymentByReference(reference: string): Promise<Payment | null>;
  /** Moves a payment to `status`; returns true only for the call that first marks it paid. */
  updateStatus(paymentId: string, status: PaymentStatus): Promise<boolean>;
  entitlement(userId: string): Promise<EntitlementState | null>;
  saveEntitlement(userId: string, state: EntitlementState): Promise<void>;
}

export interface Payment {
  id: string;
  userId: string | null;
  planId: string;
  amountMinor: number;
  pollUrl: string | null;
  status: PaymentStatus;
}

export type PollFn = (pollUrl: string) => Promise<string>;

export interface ApplyResult {
  status: PaymentStatus;
  granted: boolean;
}

/**
 * Confirms a payment's status by polling PayNow (status updates posted to us
 * could be forged), checks the signature and the amount, then records the
 * status and, the first time it is paid, extends premium.
 */
export async function confirmPayment(
  store: BillingStore,
  reference: string,
  poll: PollFn,
  integrationKey: string,
  now = new Date(),
): Promise<ApplyResult> {
  const payment = await store.paymentByReference(reference);
  if (!payment) throw new Error("unknown_reference");
  if (!payment.pollUrl) return { status: payment.status, granted: false };
  if (PAID_STATUSES.includes(payment.status)) return { status: payment.status, granted: false };

  const reply = parseMessage(await poll(payment.pollUrl));
  if (!(await verifyMessage(reply, integrationKey))) throw new Error("bad_signature");
  if (field(reply, "reference") !== reference) throw new Error("reference_mismatch");
  const status = toPaymentStatus(field(reply, "status") ?? "");
  if (!status) throw new Error("unknown_status");

  const paid = PAID_STATUSES.includes(status);
  if (paid && amountToMinor(field(reply, "amount")) !== payment.amountMinor) {
    // Never grant premium for an amount we didn't ask for.
    await store.updateStatus(payment.id, "disputed");
    throw new Error("amount_mismatch");
  }

  const firstTimePaid = await store.updateStatus(payment.id, status);
  if (!paid || !firstTimePaid || !payment.userId || !isPlanId(payment.planId)) {
    return { status, granted: false };
  }

  const existing = await store.entitlement(payment.userId);
  const start = extensionStart(existing, now);
  const next = grant(
    existing,
    {
      productId: payment.planId,
      store: "paynow",
      isActive: true,
      expiresAt: addPeriod(start, PLANS[payment.planId].period).toISOString(),
    },
    now,
  );
  await store.saveEntitlement(payment.userId, next);
  return { status, granted: true };
}

export function supabaseBillingStore(db: SupabaseClient): BillingStore {
  return {
    async paymentByReference(reference) {
      const { data, error } = await db
        .from("paynow_payments")
        .select("id, user_id, plan_id, amount_minor, poll_url, status")
        .eq("reference", reference)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
          id: data.id,
          userId: data.user_id,
          planId: data.plan_id,
          amountMinor: Number(data.amount_minor),
          pollUrl: data.poll_url,
          status: data.status,
        }
        : null;
    },
    async updateStatus(paymentId, status) {
      const paid = PAID_STATUSES.includes(status);
      // The status filter makes "first time paid" atomic even if PayNow's
      // callback and the app's poll arrive at the same moment.
      const { data, error } = await db
        .from("paynow_payments")
        .update({ status, ...(paid ? { paid_at: new Date().toISOString() } : {}) })
        .eq("id", paymentId)
        .not("status", "in", `(${PAID_STATUSES.join(",")})`)
        .select("id");
      if (error) throw error;
      return paid && (data?.length ?? 0) > 0;
    },
    async entitlement(userId) {
      const { data, error } = await db
        .from("entitlements")
        .select("product_id, store, is_active, expires_at")
        .eq("user_id", userId)
        .eq("entitlement", "premium")
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
          productId: data.product_id,
          store: data.store,
          isActive: data.is_active,
          expiresAt: data.expires_at,
        }
        : null;
    },
    async saveEntitlement(userId, state) {
      const { error } = await db.from("entitlements").upsert({
        user_id: userId,
        entitlement: "premium",
        product_id: state.productId,
        store: state.store,
        is_active: state.isActive,
        expires_at: state.expiresAt,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
  };
}
