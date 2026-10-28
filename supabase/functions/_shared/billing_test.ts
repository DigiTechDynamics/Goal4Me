import assert from "node:assert/strict";
import { type BillingStore, confirmPayment, type Payment } from "./billing.ts";
import type { EntitlementState } from "./entitlements.ts";
import { PAID_STATUSES, type PaymentStatus, signedForm } from "./paynow.ts";

const KEY = "integration-key";
const NOW = new Date("2026-10-28T10:00:00Z");

function fakeStore(payment: Payment, entitlement: EntitlementState | null = null) {
  const state = { payment: { ...payment }, entitlement, saves: 0 };
  const store: BillingStore = {
    paymentByReference: (ref) => Promise.resolve(ref === "G4M-1" ? state.payment : null),
    updateStatus: (_id, status: PaymentStatus) => {
      const wasPaid = PAID_STATUSES.includes(state.payment.status);
      if (!wasPaid) state.payment.status = status;
      return Promise.resolve(!wasPaid && PAID_STATUSES.includes(status));
    },
    entitlement: () => Promise.resolve(state.entitlement),
    saveEntitlement: (_u, next) => {
      state.entitlement = next;
      state.saves += 1;
      return Promise.resolve();
    },
  };
  return { store, state };
}

const payment: Payment = {
  id: "p1",
  userId: "u1",
  planId: "premium_quarterly",
  amountMinor: 2999,
  pollUrl: "https://paynow.test/poll",
  status: "sent",
};

const reply = (status: string, amount = "29.99", reference = "G4M-1", key = KEY) => () =>
  signedForm([["reference", reference], ["amount", amount], ["status", status]], key).then(String);

Deno.test("a paid poll grants 3 months once, even if confirmed twice", async () => {
  const { store, state } = fakeStore(payment);
  const first = await confirmPayment(store, "G4M-1", reply("Paid"), KEY, NOW);
  assert.deepEqual(first, { status: "paid", granted: true });
  assert.equal(state.entitlement?.expiresAt, "2027-01-28T10:00:00.000Z");
  assert.equal(state.entitlement?.store, "paynow");

  const second = await confirmPayment(store, "G4M-1", reply("Paid"), KEY, NOW);
  assert.equal(second.granted, false);
  assert.equal(state.saves, 1);
});

Deno.test("a renewal bought early extends from the current expiry", async () => {
  const { store, state } = fakeStore(payment, {
    productId: "premium_quarterly",
    store: "paynow",
    isActive: true,
    expiresAt: "2026-11-15T00:00:00.000Z",
  });
  await confirmPayment(store, "G4M-1", reply("Paid"), KEY, NOW);
  assert.equal(state.entitlement?.expiresAt, "2027-02-15T00:00:00.000Z");
});

Deno.test("pending statuses are recorded without granting", async () => {
  const { store, state } = fakeStore(payment);
  const result = await confirmPayment(store, "G4M-1", reply("Sent"), KEY, NOW);
  assert.deepEqual(result, { status: "sent", granted: false });
  assert.equal(state.entitlement, null);
});

Deno.test("wrong amount, bad signature or another reference never grant", async () => {
  for (
    const [poll, message] of [
      [reply("Paid", "0.01"), "amount_mismatch"],
      [reply("Paid", "29.99", "G4M-1", "forged-key"), "bad_signature"],
      [reply("Paid", "29.99", "G4M-2"), "reference_mismatch"],
    ] as const
  ) {
    const { store, state } = fakeStore(payment);
    await assert.rejects(confirmPayment(store, "G4M-1", poll, KEY, NOW), new RegExp(message));
    assert.equal(state.entitlement, null);
  }
});

Deno.test("unknown references are rejected", async () => {
  const { store } = fakeStore(payment);
  await assert.rejects(
    confirmPayment(store, "G4M-404", reply("Paid"), KEY, NOW),
    /unknown_reference/,
  );
});
