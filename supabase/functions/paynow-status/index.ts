/**
 * POST /functions/v1/paynow-status  { reference }
 * Called by the app after returning from PayNow (or while waiting for a
 * mobile-money prompt). Polls PayNow, applies the result and reports it, so
 * premium unlocks even if PayNow's own callback is delayed.
 */
import { z } from "zod";
import { confirmPayment, supabaseBillingStore } from "../_shared/billing.ts";
import { HttpError, json, requireEnv, serve } from "../_shared/http.ts";
import { PAID_STATUSES } from "../_shared/paynow.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

const bodySchema = z.object({ reference: z.string().regex(/^G4M-[A-Z0-9-]{1,20}$/) });

serve("paynow-status", async (req) => {
  const user = await requireUser(req);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "invalid_request", "Unknown payment");
  const db = adminClient();

  // Users may only ask about their own payments.
  const { data: owned } = await db
    .from("paynow_payments")
    .select("id")
    .eq("reference", parsed.data.reference)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) throw new HttpError(404, "not_found", "Unknown payment");

  const result = await confirmPayment(
    supabaseBillingStore(db),
    parsed.data.reference,
    async (url) => (await fetch(url, { method: "POST" })).text(),
    requireEnv("PAYNOW_INTEGRATION_KEY"),
  );
  return json({ status: result.status, paid: PAID_STATUSES.includes(result.status) });
});
