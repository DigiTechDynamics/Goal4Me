/**
 * POST /functions/v1/paynow-checkout  { planId, method: "web" | "ecocash" | "onemoney", phone? }
 * Starts a PayNow payment for the signed-in user. "web" returns a URL to
 * PayNow's hosted page (cards, EcoCash, OneMoney…); the mobile-money methods
 * send a USSD prompt to the phone and return instructions to show.
 */
import { z } from "zod";
import { HttpError, json, requireEnv, serve } from "../_shared/http.ts";
import {
  field,
  minorToAmount,
  parseMessage,
  PAYNOW_INITIATE_URL,
  PAYNOW_REMOTE_URL,
  signedForm,
  verifyMessage,
} from "../_shared/paynow.ts";
import { PLANS } from "../_shared/plans.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

// Mirrors paynowCheckoutSchema in packages/schemas/src/billing.ts.
const planId = z.enum(["premium_weekly", "premium_quarterly", "premium_yearly"]);
const bodySchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("web"), planId }),
  z.object({
    method: z.enum(["ecocash", "onemoney"]),
    planId,
    phone: z.string().regex(/^07\d{8}$/),
  }),
]);

serve("paynow-checkout", async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "method_not_allowed", "Use POST");
  const user = await requireUser(req);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new HttpError(400, "invalid_request", "Check the plan and phone number");
  }
  const input = parsed.data;
  const plan = PLANS[input.planId];

  const integrationId = requireEnv("PAYNOW_INTEGRATION_ID");
  const integrationKey = requireEnv("PAYNOW_INTEGRATION_KEY");
  const db = adminClient();

  // Our reference doubles as the idempotency key (unique in the table).
  const reference = `G4M-${crypto.randomUUID().slice(0, 13).toUpperCase()}`;
  const { data: payment, error } = await db
    .from("paynow_payments")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      amount_minor: plan.amountMinor,
      currency: "USD",
      reference,
    })
    .select("id")
    .single();
  if (error) throw error;

  const returnUrl = `${requireEnv("PAYNOW_RETURN_URL")}?ref=${encodeURIComponent(reference)}`;
  const fields: [string, string][] = [
    ["id", integrationId],
    ["reference", reference],
    ["amount", minorToAmount(plan.amountMinor)],
    ["additionalinfo", plan.label],
    ["returnurl", returnUrl],
    ["resulturl", requireEnv("PAYNOW_RESULT_URL")],
  ];
  if (input.method !== "web") {
    // Mobile money needs the payer's email and phone (PayNow "express checkout").
    if (!user.email) {
      throw new HttpError(400, "email_required", "Add an email to your account first");
    }
    fields.push(["authemail", user.email], ["phone", input.phone], ["method", input.method]);
  }
  fields.push(["status", "Message"]);

  const response = await fetch(input.method === "web" ? PAYNOW_INITIATE_URL : PAYNOW_REMOTE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: await signedForm(fields, integrationKey),
  });
  const reply = parseMessage(await response.text());
  const status = field(reply, "status")?.toLowerCase();

  if (status !== "ok") {
    await db.from("paynow_payments").update({ status: "failed" }).eq("id", payment.id);
    // PayNow's error text is safe to log but not shown verbatim to users.
    console.warn(
      JSON.stringify({ fn: "paynow-checkout", paynowError: field(reply, "error") ?? "unknown" }),
    );
    throw new HttpError(
      502,
      "paynow_unavailable",
      "PayNow couldn't start the payment. Please try again.",
    );
  }
  if (!(await verifyMessage(reply, integrationKey))) {
    await db.from("paynow_payments").update({ status: "failed" }).eq("id", payment.id);
    throw new HttpError(502, "paynow_bad_signature", "PayNow's reply couldn't be verified.");
  }

  const pollUrl = field(reply, "pollurl");
  await db.from("paynow_payments").update({ status: "sent", poll_url: pollUrl }).eq(
    "id",
    payment.id,
  );

  return json({
    reference,
    redirectUrl: field(reply, "browserurl") ?? null,
    instructions: field(reply, "instructions") ?? null,
  });
});
