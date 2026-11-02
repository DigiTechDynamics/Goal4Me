import { describe, expect, it } from "vitest";
import { moneySetupSchema } from "../moneySetup";

const valid = { country: "ZW", currency: "USD", moneyGoal: null, disclaimerAccepted: true };

describe("moneySetupSchema", () => {
  it("accepts a launch market, a supported currency and an optional goal", () => {
    expect(moneySetupSchema.safeParse(valid).success).toBe(true);
    expect(
      moneySetupSchema.safeParse({ ...valid, currency: "ZAR", moneyGoal: "pay_off_debt" }).success,
    ).toBe(true);
  });

  it("rejects unknown countries, currencies and goals", () => {
    expect(moneySetupSchema.safeParse({ ...valid, country: "FR" }).success).toBe(false);
    expect(moneySetupSchema.safeParse({ ...valid, currency: "EUR" }).success).toBe(false);
    expect(moneySetupSchema.safeParse({ ...valid, moneyGoal: "get_rich" }).success).toBe(false);
  });

  it("requires the disclaimer", () => {
    const result = moneySetupSchema.safeParse({ ...valid, disclaimerAccepted: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Please agree to continue");
  });
});
