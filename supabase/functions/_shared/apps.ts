/**
 * The client apps that call these functions. Goal4Me Fit and Goal4Me Money
 * share accounts and Premium, but each web app has its own origin, so PayNow
 * must send the payer back to the app they paid from.
 * Mirrors CLIENT_APPS in packages/schemas/src/billing.ts.
 */
export const CLIENT_APPS = ["fitness", "money"] as const;
export type ClientApp = (typeof CLIENT_APPS)[number];

/** Environment variable holding each app's /paynow/return page. */
const RETURN_URL_ENV: Record<ClientApp, string> = {
  fitness: "PAYNOW_RETURN_URL",
  money: "PAYNOW_RETURN_URL_MONEY",
};

/**
 * Where PayNow sends the payer after paying. Falls back to the Fit URL when
 * Money's is not configured yet: the payment still unlocks Premium (it is
 * account-wide), the payer just lands in the other web app.
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
