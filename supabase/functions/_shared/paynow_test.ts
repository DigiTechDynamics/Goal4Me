import assert from "node:assert/strict";
import {
  amountToMinor,
  field,
  minorToAmount,
  parseMessage,
  paynowHash,
  signedForm,
  toPaymentStatus,
  verifyMessage,
} from "./paynow.ts";

const KEY = "3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977";

Deno.test("hash is uppercase SHA-512 over values in order plus the key", async () => {
  const hash = await paynowHash([["a", "1"], ["b", "two"]], KEY);
  const expected = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-512", new TextEncoder().encode(`1two${KEY}`))),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("").toUpperCase();
  assert.equal(hash, expected);
  assert.match(hash, /^[0-9A-F]{128}$/);
});

Deno.test("signed messages verify, tampered ones don't", async () => {
  const body = await signedForm(
    [["reference", "G4M-1"], ["amount", "29.99"], ["status", "Paid"]],
    KEY,
  );
  const entries = parseMessage(body.toString());
  assert.equal(await verifyMessage(entries, KEY), true);
  const tampered = entries.map(([k, v]) =>
    (k === "amount" ? [k, "0.01"] : [k, v]) as [string, string]
  );
  assert.equal(await verifyMessage(tampered, KEY), false);
  assert.equal(await verifyMessage(entries.filter(([k]) => k !== "hash"), KEY), false);
  assert.equal(await verifyMessage(entries, "wrong-key"), false);
});

Deno.test("hash covers URL-decoded values (PayNow encodes URLs in replies)", async () => {
  const url = "https://www.paynow.co.zw/Interface/CheckPayment/?guid=abc";
  const body = await signedForm([["status", "Ok"], ["pollurl", url]], KEY);
  const entries = parseMessage(body.toString());
  assert.equal(field(entries, "pollurl"), url);
  assert.equal(await verifyMessage(entries, KEY), true);
});

Deno.test("statuses and amounts are normalised", () => {
  assert.equal(toPaymentStatus("Awaiting Delivery"), "awaiting_delivery");
  assert.equal(toPaymentStatus("Paid"), "paid");
  assert.equal(toPaymentStatus("Weird"), null);
  assert.equal(amountToMinor("29.99"), 2999);
  assert.equal(amountToMinor("6.9"), 690);
  assert.equal(amountToMinor("abc"), null);
  assert.equal(minorToAmount(5999), "59.99");
});
