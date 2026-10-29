/**
 * POST /functions/v1/paynow-result  (called by PayNow, form-encoded)
 * PayNow's status update. We check its signature, then confirm the status
 * by polling PayNow ourselves before granting anything (see confirmPayment).
 * Deploy with --no-verify-jwt: PayNow doesn't send a Supabase token.
 */
import { confirmPayment, supabaseBillingStore } from "../_shared/billing.ts";
import { requireEnv, serve } from "../_shared/http.ts";
import { field, parseMessage, verifyMessage } from "../_shared/paynow.ts";
import { adminClient } from "../_shared/supabase.ts";

serve("paynow-result", async (req) => {
  const integrationKey = requireEnv("PAYNOW_INTEGRATION_KEY");
  const message = parseMessage(await req.text());
  const reference = field(message, "reference");

  // Always answer 200 so PayNow doesn't retry forever on bad input; just ignore it.
  if (!reference || !(await verifyMessage(message, integrationKey))) {
    console.warn(JSON.stringify({ fn: "paynow-result", ignored: "unsigned_or_missing_reference" }));
    return new Response("ok");
  }
  const result = await confirmPayment(
    supabaseBillingStore(adminClient()),
    reference,
    async (url) => (await fetch(url, { method: "POST" })).text(),
    integrationKey,
  );
  console.log(JSON.stringify({ fn: "paynow-result", reference, ...result }));
  return new Response("ok");
});
