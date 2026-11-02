/**
 * Per-app identity for the shared kit.
 *
 * Goal4Me ships as two apps (Goal4Me Fit and Goal4Me Money) on one Supabase
 * project, so one account works in both. Everything they share (auth,
 * account, billing, UI) lives in this package; the few things that differ
 * (name, copy, where new users start, what to wipe on sign-out) come from
 * the AppConfig each app registers once, before its first screen renders.
 *
 * Kit modules read the config lazily (inside functions). The one exception
 * is initMonitoring(), which tags Sentry with the app id, so each root
 * layout imports its appConfig module first and calls initMonitoring() after.
 */

import type { ClientApp } from "@goal4me/schemas";

/** "fitness" (Goal4Me Fit) or "money" (Goal4Me Money); see CLIENT_APPS in @goal4me/schemas. */
export type AppId = ClientApp;

/** The account-wide brand: one sign-in works in both apps. */
export const ACCOUNT_BRAND = "Goal4Me";

/** Both apps, for copy that has to mention the shared account. */
export const APP_NAMES: Record<AppId, string> = {
  fitness: "Goal4Me Fit",
  money: "Goal4Me Money",
};

/** Shown wherever people should know the account is shared (sign-up, deletion). */
export const ACCOUNT_NOTE = `One ${ACCOUNT_BRAND} account works in ${APP_NAMES.fitness} and ${APP_NAMES.money}.`;

export interface LocalDataScope {
  /** The user being signed out (null when the session was already gone). */
  userId: string | null;
  /**
   * True when the account is being deleted: drop data that would normally
   * survive a sign-out, such as workouts waiting to sync.
   */
  deletingAccount: boolean;
}

export interface AppConfig {
  id: AppId;
  /** Store / home-screen name, e.g. "Goal4Me Fit". */
  name: string;
  /** Where signed-out "New to …?" links send people (a route in this app). */
  startHref: string;
  /** Call to action on that link, e.g. "Get your plan". */
  startLabel: string;
  signUp: {
    title: string;
    subtitle: string;
    /** Extra line after "Check your email…", e.g. that the quiz is kept. */
    pendingNote?: string;
  };
  /** Ticked list on the paywall: what Premium unlocks, this app first. */
  premiumBenefits: readonly string[];
  /** Legal notice at the bottom of Profile. */
  disclaimer: string;
  /** Wipes this app's own on-device stores (the shared caches are handled by the kit). */
  clearLocalData?: (scope: LocalDataScope) => void | Promise<void>;
}

let current: AppConfig | null = null;

/** Registers the running app. Call once, at the top of the root layout module. */
export function configureApp(config: AppConfig): void {
  current = config;
}

/** The running app's config; throws if configureApp() was never called. */
export function appConfig(): AppConfig {
  if (!current) throw new Error("configureApp() must run before the app renders");
  return current;
}

/** The running app's id, or null in tests and scripts that never configure one. */
export function currentAppId(): AppId | null {
  return current?.id ?? null;
}
