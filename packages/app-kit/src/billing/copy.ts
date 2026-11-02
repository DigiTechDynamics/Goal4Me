import { appConfig } from "../app/config";
import { PLAN_IDS, PLAN_PRICES_USD, type PlanId } from "@goal4me/schemas";

/** Paywall copy and plan presentation (prices from @goal4me/schemas). */
export const PLAN_COPY: Record<PlanId, { title: string; badge: string | null }> = {
  premium_weekly: { title: "1 week", badge: null },
  premium_quarterly: { title: "3 months", badge: "Most popular" },
  premium_yearly: { title: "12 months", badge: "Best value" },
};

export const PLANS_IN_ORDER: readonly PlanId[] = PLAN_IDS;

const usd = (minor: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);

export function planPrice(id: PlanId): { total: string; perWeek: string } {
  const { amountMinor, weeks } = PLAN_PRICES_USD[id];
  return { total: usd(amountMinor), perWeek: usd(Math.round(amountMinor / weeks)) };
}

/**
 * One Premium subscription unlocks both apps (it is an account entitlement),
 * so the paywall lists the running app's benefits first, then the other's.
 */
export const premiumBenefits = (): readonly string[] => appConfig().premiumBenefits;

/** Why the paywall opened, so the headline matches what the user tried to do. */
export const PAYWALL_REASONS = {
  workout: "Keep your streak going",
  lesson: "Keep learning",
  run: "Keep running",
  general: "Unlock your full plan",
} as const;
export type PaywallReason = keyof typeof PAYWALL_REASONS;

/** Store subscriptions renew; PayNow passes and promotional grants don't. */
export const autoRenews = (store: string | null): boolean =>
  store === "app_store" || store === "play_store";
