/** Small HTTP helpers shared by every function. */
const ALLOWED_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Wraps a handler with CORS preflight, JSON errors and structured logs (no personal data). */
export function serve(name: string, handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof HttpError) {
        console.warn(JSON.stringify({ fn: name, level: "warn", code: error.code }));
        return json({ error: error.code, message: error.message }, error.status);
      }
      console.error(JSON.stringify({ fn: name, level: "error", message: String(error) }));
      return json({ error: "internal", message: "Something went wrong" }, 500);
    }
  });
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
