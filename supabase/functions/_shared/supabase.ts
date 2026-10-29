import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError, requireEnv } from "./http.ts";

/** Service-role client: bypasses RLS, so only use it after checking who is asking. */
export function adminClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The signed-in user making the request (from their Supabase JWT). */
export async function requireUser(req: Request): Promise<{ id: string; email: string | null }> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "unauthenticated", "Sign in first");
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "unauthenticated", "Sign in first");
  return { id: data.user.id, email: data.user.email ?? null };
}
