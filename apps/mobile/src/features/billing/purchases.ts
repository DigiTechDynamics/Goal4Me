import type { StoreBilling } from "./purchases.types";

/**
 * Web build: there is no App Store or Play billing in a browser, so the
 * paywall uses PayNow instead. Same shape as purchases.native.ts so callers
 * type-check against one interface.
 */
const unavailable = () => Promise.reject(new Error("Store purchases aren't available on the web"));

export const storeBilling: StoreBilling = {
  available: false,
  getPlans: unavailable,
  purchase: unavailable,
  restore: unavailable,
};

export type { PurchaseOutcome, StorePlan } from "./purchases.types";
