/** Small HTTP helpers shared by every function. */

/**
 * Web origins allowed to call the functions: APP_ORIGIN is a comma-separated
 * list, one per web app (Goal4Me Fit and Goal4Me Money live on different
 * origins), or unset / "*" to allow any (local development).
 */
const ALLOWED_ORIGINS = parseOrigins(Deno.env.get("APP_ORIGIN"));

export function parseOrigins(value: string | undefined): string[] {
  const list = (value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  return list.length > 0 ? list : ["*"];
}

/**
 * The Access-Control-Allow-Origin value for a request: the caller's origin
 * when it is on the list (browsers accept only one origin per response),
 * otherwise the first allowed origin, which the browser will then reject.
 */
export function allowOrigin(allowed: string[], requestOrigin: string | null): string {
  if (allowed.includes("*")) return "*";
  return requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0];
}

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function withCors(response: Response, req: Request): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  headers.set(
    "Access-Control-Allow-Origin",
    allowOrigin(ALLOWED_ORIGINS, req.headers.get("Origin")),
  );
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Wraps a handler with CORS preflight, JSON errors and structured logs (no personal data). */
export function serve(name: string, handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => withCors(await handle(name, handler, req), req));
}

async function handle(
  name: string,
  handler: (req: Request) => Promise<Response>,
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok");
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
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
