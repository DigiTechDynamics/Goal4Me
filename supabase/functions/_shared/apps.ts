/**
 * The client apps that call these functions. Goal4Me Fit and Goal4Me Money
 * share accounts and Premium, but each web app has its own origin, so PayNow
 * must send the payer back to the app they paid from.
 * Mirrors CLIENT_APPS in packages/schemas/src/billing.ts.
 */
export const CLIENT_APPS = ["fitness", "money"] as const;
export type ClientApp = (typeof CLIENT_APPS)[number];

/**
 * Each app sells its own Premium plan, stored as its own entitlement row.
 * Mirrors ENTITLEMENT_FOR_APP in packages/schemas/src/billing.ts.
 */
export const ENTITLEMENT_FOR_APP = {
  fitness: "fit_premium",
  money: "money_premium",
} as const;
export type Entitlement = (typeof ENTITLEMENT_FOR_APP)[ClientApp];
export const ENTITLEMENTS: readonly Entitlement[] = Object.values(ENTITLEMENT_FOR_APP);

export const isEntitlement = (value: unknown): value is Entitlement =>
  typeof value === "string" && (ENTITLEMENTS as readonly string[]).includes(value);

/** Plan name shown on PayNow's page and receipts. */
export const PLAN_BRAND: Record<Entitlement, string> = {
  fit_premium: "Goal4Me Fit Premium",
  money_premium: "Goal4Me Money Premium",
};

/** Environment variable holding each app's /paynow/return page. */
const RETURN_URL_ENV: Record<ClientApp, string> = {
  fitness: "PAYNOW_RETURN_URL",
  money: "PAYNOW_RETURN_URL_MONEY",
};

/**
 * Where PayNow sends the payer after paying. Falls back to the Fit URL when
 * Money's is not configured yet: the payment still unlocks Money Premium
 * (the payment row records which plan was bought), the payer just lands in
 * the other web app and has to open Money to use it.
 */
export function paynowReturnUrl(
  app: ClientApp,
  reference: string,
  getEnv: (name: string) => string | undefined,
): string {
  const base = getEnv(RETURN_URL_ENV[app]) || getEnv(RETURN_URL_ENV.fitness);
  if (!base) throw new Error(`Missing environment variable ${RETURN_URL_ENV.fitness}`);
  return `${base}?ref=${encodeURIComponent(reference)}`;
}
