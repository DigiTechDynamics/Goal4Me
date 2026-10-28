/**
 * Pure rules for the single "premium" entitlement row per user, shared by
 * the PayNow and RevenueCat functions. One row covers every store, so the
 * rules make sure one store can never cut short time bought in another.
 */
export type Store = "app_store" | "play_store" | "paynow" | "promotional";

export interface EntitlementState {
  productId: string;
  store: Store;
  isActive: boolean;
  /** ISO timestamp; null = never expires. */
  expiresAt: string | null;
}

const activeUntil = (e: EntitlementState | null, now: Date): number | null => {
  if (!e?.isActive) return null;
  if (e.expiresAt === null) return Infinity;
  const t = Date.parse(e.expiresAt);
  return t > now.getTime() ? t : null;
};

/**
 * A purchase or renewal: the result runs until the later of the two expiries,
 * so buying again early (or in another store) never loses paid time.
 */
export function grant(
  existing: EntitlementState | null,
  incoming: EntitlementState,
  now: Date,
): EntitlementState {
  const current = activeUntil(existing, now);
  const next = incoming.expiresAt === null ? Infinity : Date.parse(incoming.expiresAt);
  if (existing && current !== null && current > next) {
    return { ...existing, isActive: true };
  }
  return { ...incoming, isActive: true };
}

/**
 * An expiry reported by one store only ends the entitlement if that store
 * owns it; a PayNow purchase is unaffected by an App Store expiry.
 */
export function expire(existing: EntitlementState | null, store: Store): EntitlementState | null {
  if (!existing || existing.store !== store) return existing;
  return { ...existing, isActive: false };
}

/** Starting point for extending a PayNow purchase: now, or the end of current paid time. */
export function extensionStart(existing: EntitlementState | null, now: Date): Date {
  const current = activeUntil(existing, now);
  return current === null || current === Infinity ? now : new Date(current);
}
