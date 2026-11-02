import type { PlanId } from "@goal4me/schemas";

/**
 * App Store / Google Play subscriptions through RevenueCat. The native
 * implementation lives in purchases.native.ts; purchases.ts is the web build,
 * where store billing doesn't exist (the web uses PayNow instead).
 */
export interface StorePlan {
  planId: PlanId;
  /** Localised total price from the store, e.g. "R 129,99". */
  price: string;
  /** Localised weekly equivalent, when the store provides one. */
  perWeek: string | null;
  /** Free-trial length in days (yearly plan), or null. */
  trialDays: number | null;
}

export type PurchaseOutcome = "purchased" | "cancelled";

export interface StoreBilling {
  /** False on the web, or before the RevenueCat keys are configured. */
  available: boolean;
  getPlans(userId: string): Promise<StorePlan[]>;
  purchase(userId: string, planId: PlanId): Promise<PurchaseOutcome>;
  /** Re-links earlier purchases to this account; true when one is active. */
  restore(userId: string): Promise<boolean>;
}
