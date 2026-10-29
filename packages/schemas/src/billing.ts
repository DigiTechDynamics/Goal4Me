import { z } from "zod";

/** Store-agnostic product ids; RevenueCat and PayNow both map to these. */
export const PLAN_IDS = ["premium_weekly", "premium_quarterly", "premium_yearly"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Body of POST /functions/v1/paynow-checkout (web purchases in Zimbabwe). */
export const paynowCheckoutSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("web"), planId: z.enum(PLAN_IDS) }),
  z.object({
    method: z.enum(["ecocash", "onemoney"]),
    planId: z.enum(PLAN_IDS),
    // Zimbabwean mobile number, e.g. 0771234567.
    phone: z.string().regex(/^07\d{8}$/, "Enter a mobile number like 0771234567"),
  }),
]);
export type PaynowCheckoutRequest = z.infer<typeof paynowCheckoutSchema>;

/**
 * Launch prices in US cents (spec: Monetisation). PayNow charges these on the
 * web; store prices are set per country in App Store Connect / Play Console.
 * Kept in sync with supabase/functions/_shared/plans.ts by a unit test.
 */
export const PLAN_PRICES_USD: Record<PlanId, { amountMinor: number; weeks: number }> = {
  premium_weekly: { amountMinor: 699, weeks: 1 },
  premium_quarterly: { amountMinor: 2999, weeks: 13 },
  premium_yearly: { amountMinor: 5999, weeks: 52 },
};
