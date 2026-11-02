import assert from "node:assert/strict";
import { type EntitlementState, expire, extensionStart, grant } from "./entitlements.ts";
import { addPeriod } from "./plans.ts";
import { applyRevenueCatEvent } from "./revenuecat.ts";
import type { BillingStore } from "./billing.ts";

const NOW = new Date("2026-10-28T00:00:00Z");
const paynowYear: EntitlementState = {
  productId: "premium_yearly",
  store: "paynow",
  isActive: true,
  expiresAt: "2027-10-28T00:00:00.000Z",
};

Deno.test("a shorter purchase in another store never shortens paid time", () => {
  const appStoreWeek: EntitlementState = {
    productId: "weekly",
    store: "app_store",
    isActive: true,
    expiresAt: "2026-11-04T00:00:00.000Z",
  };
  assert.deepEqual(grant(paynowYear, appStoreWeek, NOW), paynowYear);
  assert.deepEqual(grant(null, appStoreWeek, NOW), appStoreWeek);
});

Deno.test("an expiry from one store doesn't end another store's entitlement", () => {
  assert.equal(expire(paynowYear, "app_store"), paynowYear);
  assert.equal(expire(paynowYear, "paynow")?.isActive, false);
});

Deno.test("extensions start at the current expiry, or now if lapsed", () => {
  assert.equal(extensionStart(paynowYear, NOW).toISOString(), "2027-10-28T00:00:00.000Z");
  assert.equal(extensionStart({ ...paynowYear, expiresAt: "2026-01-01T00:00:00Z" }, NOW), NOW);
});

Deno.test("periods are month-end safe", () => {
  assert.equal(
    addPeriod(new Date("2027-01-31T12:00:00Z"), { months: 1 }).toISOString(),
    "2027-02-28T12:00:00.000Z",
  );
  assert.equal(
    addPeriod(new Date("2026-10-28T00:00:00Z"), { days: 7 }).toISOString(),
    "2026-11-04T00:00:00.000Z",
  );
});

function memoryStore(initial: EntitlementState | null) {
  const rows = new Map<string, EntitlementState | null>([["fit_premium", initial]]);
  const store: BillingStore = {
    paymentByReference: () => Promise.resolve(null),
    updateStatus: () => Promise.resolve(false),
    entitlement: (_u, name) => Promise.resolve(rows.get(name) ?? null),
    saveEntitlement: (_u, name, next) => {
      rows.set(name, next);
      return Promise.resolve();
    },
  };
  return {
    store,
    get: (name = "fit_premium") => rows.get(name) ?? null,
  };
}

const USER = "11111111-1111-4111-8111-111111111111";

Deno.test("RevenueCat purchases grant and expirations revoke their own store only", async () => {
  const m = memoryStore(null);
  assert.equal(
    await applyRevenueCatEvent(m.store, {
      type: "INITIAL_PURCHASE",
      app_user_id: USER,
      product_id: "goal4me_yearly",
      entitlement_ids: ["fit_premium"],
      store: "APP_STORE",
      expiration_at_ms: Date.parse("2027-10-28T00:00:00Z"),
    }, NOW),
    "granted",
  );
  assert.equal(m.get()?.store, "app_store");
  assert.equal(
    await applyRevenueCatEvent(m.store, {
      type: "EXPIRATION",
      app_user_id: USER,
      entitlement_ids: ["fit_premium"],
      store: "PLAY_STORE",
    }, NOW),
    "ignored",
  );
  assert.equal(m.get()?.isActive, true);
  assert.equal(
    await applyRevenueCatEvent(m.store, {
      type: "EXPIRATION",
      app_user_id: USER,
      entitlement_ids: ["fit_premium"],
      store: "APP_STORE",
    }, NOW),
    "expired",
  );
  assert.equal(m.get()?.isActive, false);
});

Deno.test("RevenueCat events for anonymous ids or unknown stores are ignored", async () => {
  const m = memoryStore(null);
  for (
    const event of [
      { type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc", store: "APP_STORE" },
      { type: "INITIAL_PURCHASE", app_user_id: USER, store: "STRIPE" },
      { type: "BILLING_ISSUE", app_user_id: USER, store: "APP_STORE" },
      // No entitlement we sell (or none at all): nothing to grant.
      { type: "INITIAL_PURCHASE", app_user_id: USER, store: "APP_STORE" },
      {
        type: "INITIAL_PURCHASE",
        app_user_id: USER,
        store: "APP_STORE",
        entitlement_ids: ["something_else"],
      },
    ]
  ) {
    assert.equal(await applyRevenueCatEvent(m.store, event, NOW), "ignored");
  }
  assert.equal(m.get(), null);
});

Deno.test("a store purchase unlocks only the app it was bought in", async () => {
  const m = memoryStore(null);
  await applyRevenueCatEvent(m.store, {
    type: "INITIAL_PURCHASE",
    app_user_id: USER,
    product_id: "money_yearly",
    entitlement_ids: ["money_premium"],
    store: "PLAY_STORE",
    expiration_at_ms: Date.parse("2027-10-28T00:00:00Z"),
  }, NOW);
  assert.equal(m.get("money_premium")?.isActive, true);
  assert.equal(m.get("fit_premium"), null);
});

Deno.test("renewals of pre-split 'premium' subscriptions extend Fit Premium", async () => {
  const m = memoryStore(null);
  await applyRevenueCatEvent(m.store, {
    type: "RENEWAL",
    app_user_id: USER,
    entitlement_ids: ["premium"],
    store: "APP_STORE",
    expiration_at_ms: Date.parse("2027-10-28T00:00:00Z"),
  }, NOW);
  assert.equal(m.get("fit_premium")?.isActive, true);
  assert.equal(m.get("money_premium"), null);
});
