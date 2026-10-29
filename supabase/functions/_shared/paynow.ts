/**
 * PayNow (Zimbabwe) protocol helpers. Every message to and from PayNow is
 * form-encoded and signed: hash = UPPERCASE(SHA512(all values in order + integration key)).
 * We verify the hash on every response and status update, and never trust a
 * status update without polling PayNow ourselves.
 */
export const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
export const PAYNOW_REMOTE_URL = "https://www.paynow.co.zw/interface/remotetransaction";

/** Our database status values (lowercase, underscores). */
export type PaymentStatus =
  | "created"
  | "sent"
  | "paid"
  | "awaiting_delivery"
  | "delivered"
  | "cancelled"
  | "failed"
  | "disputed"
  | "refunded";

/** PayNow treats these as "money received". */
export const PAID_STATUSES: readonly PaymentStatus[] = ["paid", "awaiting_delivery", "delivered"];

export function toPaymentStatus(paynowStatus: string): PaymentStatus | null {
  const normalised = paynowStatus.trim().toLowerCase().replace(/\s+/g, "_");
  const known: readonly string[] = [
    "created",
    "sent",
    "paid",
    "awaiting_delivery",
    "delivered",
    "cancelled",
    "failed",
    "disputed",
    "refunded",
  ];
  return known.includes(normalised) ? (normalised as PaymentStatus) : null;
}

async function sha512Upper(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
    .toUpperCase();
}

/** Hash over the values (not keys) in order, skipping any "hash" field. */
export function paynowHash(
  entries: readonly [string, string][],
  integrationKey: string,
): Promise<string> {
  const joined = entries.filter(([key]) => key.toLowerCase() !== "hash").map(([, value]) => value)
    .join("");
  return sha512Upper(joined + integrationKey);
}

/** Builds the signed form body for an outgoing request. */
export async function signedForm(
  fields: readonly [string, string][],
  integrationKey: string,
): Promise<URLSearchParams> {
  const body = new URLSearchParams(fields as [string, string][]);
  body.append("hash", await paynowHash(fields, integrationKey));
  return body;
}

/** Parses a PayNow reply or status update, keeping field order for the hash. */
export function parseMessage(text: string): [string, string][] {
  return [...new URLSearchParams(text.trim()).entries()];
}

/** Constant-time comparison so the hash check doesn't leak timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyMessage(
  entries: readonly [string, string][],
  integrationKey: string,
): Promise<boolean> {
  const received = entries.find(([key]) => key.toLowerCase() === "hash")?.[1];
  if (!received) return false;
  return safeEqual(received.toUpperCase(), await paynowHash(entries, integrationKey));
}

export const field = (entries: readonly [string, string][], name: string): string | undefined =>
  entries.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];

/** "29.99" → 2999; PayNow sends amounts as decimal strings. */
export function amountToMinor(amount: string | undefined): number | null {
  if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount.trim())) return null;
  return Math.round(Number(amount) * 100);
}

export const minorToAmount = (minor: number): string => (minor / 100).toFixed(2);
