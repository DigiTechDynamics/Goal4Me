/**
 * POST /functions/v1/revenuecat-webhook  (called by RevenueCat)
 * Keeps the premium entitlement in sync with App Store / Google Play
 * subscriptions. The app sets RevenueCat's app_user_id to the Supabase user id.
 * Deploy with --no-verify-jwt; authenticity is checked with a shared secret.
 */
import { applyRevenueCatEvent, type RevenueCatEvent } from "../_shared/revenuecat.ts";
import { supabaseBillingStore } from "../_shared/billing.ts";
import { HttpError, json, requireEnv, serve } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

serve("revenuecat-webhook", async (req) => {
  const expected = `Bearer ${requireEnv("REVENUECAT_WEBHOOK_SECRET")}`;
  if (req.headers.get("Authorization") !== expected) {
    throw new HttpError(401, "unauthorized", "Bad webhook secret");
  }
  const body = (await req.json().catch(() => null)) as { event?: RevenueCatEvent } | null;
  if (!body?.event?.type) throw new HttpError(400, "invalid_request", "Missing event");

  const outcome = await applyRevenueCatEvent(supabaseBillingStore(adminClient()), body.event);
  console.log(JSON.stringify({ fn: "revenuecat-webhook", type: body.event.type, outcome }));
  return json({ ok: true, outcome });
});
