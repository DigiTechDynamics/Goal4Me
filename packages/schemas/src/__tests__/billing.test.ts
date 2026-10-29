import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { paynowCheckoutSchema, PLAN_IDS, PLAN_PRICES_USD } from "../index";

describe("billing", () => {
  it("charges the same prices in the app and the PayNow Edge Function", () => {
    const deno = readFileSync(
      fileURLToPath(new URL("../../../../supabase/functions/_shared/plans.ts", import.meta.url)),
      "utf8",
    );
    for (const id of PLAN_IDS) {
      const block = deno.slice(deno.indexOf(`${id}: {`));
      const amount = Number(/amountMinor: (\d+)/.exec(block)?.[1]);
      expect(amount, id).toBe(PLAN_PRICES_USD[id].amountMinor);
    }
  });

  it("requires a Zimbabwean mobile number for mobile money", () => {
    expect(
      paynowCheckoutSchema.safeParse({ method: "web", planId: "premium_yearly" }).success,
    ).toBe(true);
    expect(
      paynowCheckoutSchema.safeParse({
        method: "ecocash",
        planId: "premium_yearly",
        phone: "0771234567",
      }).success,
    ).toBe(true);
    expect(
      paynowCheckoutSchema.safeParse({
        method: "ecocash",
        planId: "premium_yearly",
        phone: "12345",
      }).success,
    ).toBe(false);
  });
});
