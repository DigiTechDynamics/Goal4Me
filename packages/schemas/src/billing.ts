import { z } from "zod";

/** Store-agnostic product ids; RevenueCat and PayNow both map to these. */
export const PLAN_IDS = ["premium_weekly", "premium_quarterly", "premium_yearly"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/**
 * The client apps (Goal4Me Fit and Goal4Me Money). They share accounts and
 * Premium; the id tells PayNow which web app to return the payer to.
 * Mirrors CLIENT_APPS in supabase/functions/_shared/apps.ts.
 */
export const CLIENT_APPS = ["fitness", "money"] as const;
export type ClientApp = (typeof CLIENT_APPS)[number];

/**
 * Each app sells its own Premium plan, stored as its own entitlement row
 * (and named the same in RevenueCat). Buying one never unlocks the other.
 * Mirrors ENTITLEMENT_FOR_APP in supabase/functions/_shared/apps.ts.
 */
export const ENTITLEMENT_FOR_APP = {
  fitness: "fit_premium",
  money: "money_premium",
} as const satisfies Record<ClientApp, string>;
export type Entitlement = (typeof ENTITLEMENT_FOR_APP)[ClientApp];

/** Body of POST /functions/v1/paynow-checkout (web purchases in Zimbabwe). */
export const paynowCheckoutSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("web"),
    planId: z.enum(PLAN_IDS),
    app: z.enum(CLIENT_APPS).optional(),
  }),
  z.object({
    method: z.enum(["ecocash", "onemoney"]),
    planId: z.enum(PLAN_IDS),
    // Zimbabwean mobile number, e.g. 0771234567.
    phone: z.string().regex(/^07\d{8}$/, "Enter a mobile number like 0771234567"),
    app: z.enum(CLIENT_APPS).optional(),
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
