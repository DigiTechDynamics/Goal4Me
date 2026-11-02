import { LAUNCH_MARKETS, type CountryCode, type CurrencyCode } from "@goal4me/core";
import { moneySetupSchema, type MONEY_GOALS, type MoneySetupInput } from "@goal4me/schemas";

/**
 * Goal4Me Money's first-run setup as pure data and functions (the screen
 * only renders it), so the flow is unit-tested without React Native.
 */

export const SETUP_STEPS = ["country", "currency", "goal", "agree"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export interface SetupDraft {
  country: CountryCode | null;
  currency: CurrencyCode | null;
  moneyGoal: MoneySetupInput["moneyGoal"];
  disclaimerAccepted: boolean;
}

export const EMPTY_SETUP: SetupDraft = {
  country: null,
  currency: null,
  moneyGoal: null,
  disclaimerAccepted: false,
};

export const COUNTRY_OPTIONS: readonly { value: CountryCode; label: string }[] = [
  { value: "ZW", label: "Zimbabwe" },
  { value: "ZA", label: "South Africa" },
  { value: "BW", label: "Botswana" },
  { value: "ZM", label: "Zambia" },
  { value: "MW", label: "Malawi" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "IN", label: "India" },
];

export const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  USD: "US dollar",
  ZAR: "South African rand",
  BWP: "Botswana pula",
  ZMW: "Zambian kwacha",
  MWK: "Malawian kwacha",
  GBP: "British pound",
  INR: "Indian rupee",
};

export const MONEY_GOAL_OPTIONS: readonly {
  value: (typeof MONEY_GOALS)[number];
  label: string;
  description: string;
}[] = [
  {
    value: "build_emergency_fund",
    label: "Build an emergency fund",
    description: "A cushion for surprises",
  },
  { value: "pay_off_debt", label: "Pay off debt", description: "Clear what you owe, faster" },
  {
    value: "save_for_purchase",
    label: "Save for something big",
    description: "A phone, school fees, a car",
  },
  { value: "start_investing", label: "Start investing", description: "Make your money grow" },
  { value: "budget_better", label: "Budget better", description: "Know where every dollar goes" },
];

/** Choosing a country preselects its currency, unless one was already picked by hand. */
export function chooseCountry(draft: SetupDraft, country: CountryCode): SetupDraft {
  const previousDefault = draft.country ? LAUNCH_MARKETS[draft.country] : null;
  const keepCurrency = draft.currency !== null && draft.currency !== previousDefault;
  return {
    ...draft,
    country,
    currency: keepCurrency ? draft.currency : LAUNCH_MARKETS[country],
  };
}

/** Why the user can't leave this step yet, or null when they can. The goal step is optional. */
export function validateSetupStep(step: SetupStep, draft: SetupDraft): string | null {
  switch (step) {
    case "country":
      return draft.country ? null : "Choose where you live";
    case "currency":
      return draft.currency ? null : "Choose a currency";
    case "goal":
      return null;
    case "agree":
      return draft.disclaimerAccepted ? null : "Please agree to continue";
  }
}

/** The validated request for complete_money_setup, or the first problem to show. */
export function toSetupInput(
  draft: SetupDraft,
): { ok: true; input: MoneySetupInput } | { ok: false; message: string } {
  const parsed = moneySetupSchema.safeParse(draft);
  return parsed.success
    ? { ok: true, input: parsed.data }
    : { ok: false, message: parsed.error.issues[0]?.message ?? "Check your answers" };
}
