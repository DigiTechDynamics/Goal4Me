import type { BillingStore } from "./billing.ts";
import { expire, grant, type Store } from "./entitlements.ts";

/** The fields of a RevenueCat webhook event that we use. */
export interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  product_id?: string;
  store?: string;
  expiration_at_ms?: number | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STORE: Record<string, Store> = {
  APP_STORE: "app_store",
  MAC_APP_STORE: "app_store",
  PLAY_STORE: "play_store",
  PROMOTIONAL: "promotional",
};

const GRANTING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  // A cancellation keeps access until the period ends, so it just refreshes the expiry.
  "CANCELLATION",
]);

export type Outcome = "granted" | "expired" | "ignored";

export async function applyRevenueCatEvent(
  store: BillingStore,
  event: RevenueCatEvent,
  now = new Date(),
): Promise<Outcome> {
  // Anonymous RevenueCat ids ($RCAnonymousID…) aren't linked to an account yet.
  if (!event.app_user_id || !UUID.test(event.app_user_id)) return "ignored";
  const source = STORE[event.store ?? ""];
  if (!source) return "ignored";
  const userId = event.app_user_id;
  const existing = await store.entitlement(userId);

  if (GRANTING.has(event.type)) {
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;
    await store.saveEntitlement(
      userId,
      grant(existing, {
        productId: event.product_id ?? "premium",
        store: source,
        isActive: true,
        expiresAt,
      }, now),
    );
    return "granted";
  }
  if (event.type === "EXPIRATION") {
    const next = expire(existing, source);
    if (next && next !== existing) {
      await store.saveEntitlement(userId, next);
      return "expired";
    }
  }
  return "ignored";
}
