import { describe, expect, it } from "vitest";
import {
  chooseCountry,
  COUNTRY_OPTIONS,
  CURRENCY_LABEL,
  EMPTY_SETUP,
  SETUP_STEPS,
  toSetupInput,
  validateSetupStep,
} from "../flow";
import { LAUNCH_MARKETS, SUPPORTED_CURRENCIES } from "@goal4me/core";

describe("money setup flow", () => {
  it("offers every launch market and names every supported currency", () => {
    expect(COUNTRY_OPTIONS.map((c) => c.value).sort()).toEqual(Object.keys(LAUNCH_MARKETS).sort());
    for (const code of SUPPORTED_CURRENCIES) expect(CURRENCY_LABEL[code]).toBeTruthy();
  });

  it("preselects the country's currency", () => {
    expect(chooseCountry(EMPTY_SETUP, "ZA").currency).toBe("ZAR");
    // Switching country moves a default currency along with it…
    expect(chooseCountry(chooseCountry(EMPTY_SETUP, "ZA"), "BW").currency).toBe("BWP");
  });

  it("keeps a currency the user picked by hand", () => {
    const picked = { ...chooseCountry(EMPTY_SETUP, "ZW"), currency: "ZAR" as const };
    expect(chooseCountry(picked, "BW").currency).toBe("ZAR");
  });

  it("requires country, currency and the disclaimer, but not a goal", () => {
    expect(validateSetupStep("country", EMPTY_SETUP)).toBe("Choose where you live");
    expect(validateSetupStep("currency", EMPTY_SETUP)).toBe("Choose a currency");
    expect(validateSetupStep("goal", EMPTY_SETUP)).toBeNull();
    expect(validateSetupStep("agree", EMPTY_SETUP)).toBe("Please agree to continue");
    expect(SETUP_STEPS.at(-1)).toBe("agree");
  });

  it("builds the request only from a complete draft", () => {
    expect(toSetupInput(EMPTY_SETUP).ok).toBe(false);
    const done = { ...chooseCountry(EMPTY_SETUP, "ZW"), disclaimerAccepted: true };
    expect(toSetupInput(done)).toEqual({
      ok: true,
      input: { country: "ZW", currency: "USD", moneyGoal: null, disclaimerAccepted: true },
    });
  });
});
