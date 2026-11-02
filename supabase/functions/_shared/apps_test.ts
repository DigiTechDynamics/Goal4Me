import assert from "node:assert/strict";
import { ENTITLEMENT_FOR_APP, isEntitlement, paynowReturnUrl } from "./apps.ts";
import { allowOrigin, parseOrigins } from "./http.ts";

const env = (values: Record<string, string>) => (name: string) => values[name];

Deno.test("PayNow returns the payer to the app they paid from", () => {
  const vars = env({
    PAYNOW_RETURN_URL: "https://fit.goal4me.com/paynow/return",
    PAYNOW_RETURN_URL_MONEY: "https://money.goal4me.com/paynow/return",
  });
  assert.equal(
    paynowReturnUrl("fitness", "G4M-1", vars),
    "https://fit.goal4me.com/paynow/return?ref=G4M-1",
  );
  assert.equal(
    paynowReturnUrl("money", "G4M 2", vars),
    "https://money.goal4me.com/paynow/return?ref=G4M%202",
  );
});

Deno.test("Money falls back to the Fit return page until its own is set", () => {
  const vars = env({ PAYNOW_RETURN_URL: "https://fit.goal4me.com/paynow/return" });
  assert.equal(
    paynowReturnUrl("money", "G4M-1", vars),
    "https://fit.goal4me.com/paynow/return?ref=G4M-1",
  );
  assert.throws(() => paynowReturnUrl("fitness", "G4M-1", env({})), /PAYNOW_RETURN_URL/);
});

Deno.test("CORS allows each listed web app's origin", () => {
  const allowed = parseOrigins(" https://fit.goal4me.com , https://money.goal4me.com ");
  assert.deepEqual(allowed, ["https://fit.goal4me.com", "https://money.goal4me.com"]);
  assert.equal(allowOrigin(allowed, "https://money.goal4me.com"), "https://money.goal4me.com");
  assert.equal(allowOrigin(allowed, "https://evil.example"), "https://fit.goal4me.com");
  assert.equal(allowOrigin(allowed, null), "https://fit.goal4me.com");
  assert.deepEqual(parseOrigins(undefined), ["*"]);
  assert.equal(allowOrigin(parseOrigins(""), "https://any.example"), "*");
});

Deno.test("each app sells its own Premium entitlement", () => {
  assert.equal(ENTITLEMENT_FOR_APP.fitness, "fit_premium");
  assert.equal(ENTITLEMENT_FOR_APP.money, "money_premium");
  assert.equal(isEntitlement("premium"), false);
});
