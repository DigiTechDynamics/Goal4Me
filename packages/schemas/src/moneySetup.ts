import { LAUNCH_MARKETS, type CountryCode } from "@goal4me/core";
import { z } from "zod";
import { currency } from "./common";
import { MONEY_GOALS } from "./quiz";

const countryCodes = Object.keys(LAUNCH_MARKETS) as [CountryCode, ...CountryCode[]];

/**
 * Goal4Me Money's first-run setup (complete_money_setup). The currency
 * defaults to the country's but can differ (many people in Zimbabwe budget
 * in USD, others in ZAR). The disclaimer must be accepted to continue.
 */
export const moneySetupSchema = z.object({
  country: z.enum(countryCodes, { errorMap: () => ({ message: "Choose where you live" }) }),
  currency,
  moneyGoal: z.enum(MONEY_GOALS).nullable(),
  disclaimerAccepted: z.literal(true, {
    errorMap: () => ({ message: "Please agree to continue" }),
  }),
});
export type MoneySetupInput = z.infer<typeof moneySetupSchema>;
