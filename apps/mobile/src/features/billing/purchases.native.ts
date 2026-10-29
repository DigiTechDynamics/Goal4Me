import type { PlanId } from "@goal4me/schemas";
import { Platform } from "react-native";
import Purchases, {
  PACKAGE_TYPE,
  type PurchasesError,
  type PurchasesPackage,
} from "react-native-purchases";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { StoreBilling, StorePlan } from "./purchases.types";

/**
 * App Store / Google Play subscriptions via RevenueCat. The RevenueCat
 * customer id is the Supabase user id, so the revenuecat-webhook Edge
 * Function can grant premium to the right account.
 */
const apiKey =
  Platform.OS === "ios"
    ? env?.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : env?.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

/** Store package type for each plan (set up as the "default" offering in RevenueCat). */
const PACKAGE_FOR_PLAN: Record<PlanId, PACKAGE_TYPE> = {
  premium_weekly: PACKAGE_TYPE.WEEKLY,
  premium_quarterly: PACKAGE_TYPE.THREE_MONTH,
  premium_yearly: PACKAGE_TYPE.ANNUAL,
};

/** Configures the SDK once, and switches customer when a different user signs in. */
async function identify(userId: string): Promise<void> {
  if (!apiKey) throw new Error("Store purchases aren't set up yet");
  if (!(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey, appUserID: userId });
    return;
  }
  if ((await Purchases.getAppUserID()) !== userId) await Purchases.logIn(userId);
}

async function packages(userId: string): Promise<Map<PlanId, PurchasesPackage>> {
  await identify(userId);
  const offering = (await Purchases.getOfferings()).current;
  const found = new Map<PlanId, PurchasesPackage>();
  for (const [planId, type] of Object.entries(PACKAGE_FOR_PLAN) as [PlanId, PACKAGE_TYPE][]) {
    const pkg = offering?.availablePackages.find((p) => p.packageType === type);
    if (pkg) found.set(planId, pkg);
  }
  return found;
}

const DAYS_PER_UNIT: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** Store trial period trial period (e.g. 1 × WEEK) in days. */
function trialDays(pkg: PurchasesPackage): number | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unitDays = DAYS_PER_UNIT[intro.periodUnit] ?? 0;
  return unitDays * intro.periodNumberOfUnits || null;
}

const isCancelled = (error: unknown) => !!(error as PurchasesError | null)?.userCancelled;

export const storeBilling: StoreBilling = {
  available: !!apiKey,

  async getPlans(userId) {
    const found = await packages(userId);
    return [...found].map(([planId, pkg]): StorePlan => ({
      planId,
      price: pkg.product.priceString,
      perWeek: pkg.product.pricePerWeekString,
      trialDays: trialDays(pkg),
    }));
  },

  async purchase(userId, planId) {
    const pkg = (await packages(userId)).get(planId);
    if (!pkg) throw new Error("This plan isn't available in your store right now");
    try {
      await Purchases.purchasePackage(pkg);
      return "purchased";
    } catch (error) {
      if (isCancelled(error)) return "cancelled";
      logger.warn("store purchase failed", { planId, error: String(error) });
      throw error;
    }
  },

  async restore(userId) {
    await identify(userId);
    const info = await Purchases.restorePurchases();
    return Object.keys(info.entitlements.active).length > 0;
  },
};

export type { PurchaseOutcome, StorePlan } from "./purchases.types";
