import { type Entitlement, isEntitlement } from "./apps.ts";
import type { BillingStore } from "./billing.ts";
import { expire, grant, type Store } from "./entitlements.ts";

/** The fields of a RevenueCat webhook event that we use. */
export interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  product_id?: string;
  /** RevenueCat entitlement identifiers the event affects ("fit_premium", "money_premium"). */
  entitlement_ids?: string[] | null;
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

/**
 * Our entitlements an event affects. Each app has its own RevenueCat
 * entitlement named like ours. Subscriptions bought before the split used
 * "premium", and every store purchase back then came from the Fit app.
 */
export function entitlementsOf(event: RevenueCatEvent): Entitlement[] {
  const ids = (event.entitlement_ids ?? []).map((id) => (id === "premium" ? "fit_premium" : id));
  return [...new Set(ids.filter(isEntitlement))];
}

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
  const entitlements = entitlementsOf(event);
  if (entitlements.length === 0) return "ignored";

  let outcome: Outcome = "ignored";
  for (const entitlement of entitlements) {
    const existing = await store.entitlement(userId, entitlement);
    if (GRANTING.has(event.type)) {
      const expiresAt = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;
      await store.saveEntitlement(
        userId,
        entitlement,
        grant(existing, {
          productId: event.product_id ?? entitlement,
          store: source,
          isActive: true,
          expiresAt,
        }, now),
      );
      outcome = "granted";
    } else if (event.type === "EXPIRATION") {
      const next = expire(existing, source);
      if (next && next !== existing) {
        await store.saveEntitlement(userId, entitlement, next);
        outcome = "expired";
      }
    }
  }
  return outcome;
}
