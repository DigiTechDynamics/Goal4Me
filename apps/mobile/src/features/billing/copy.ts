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

export const PREMIUM_BENEFITS = [
  "Every workout in your 4-week programme, adapted to you",
  "All 30 money lessons and quizzes",
  "Every run in your running plan, from 5K to marathon",
  "New programmes as they launch",
  "Support Goal4Me's development",
];

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
