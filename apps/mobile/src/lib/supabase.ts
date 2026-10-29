import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { env } from "./env";

/**
 * The single Supabase client. It is null only when configuration is missing,
 * in which case the root layout shows the configuration screen and nothing
 * else in the app runs.
 *
 * - PKCE flow: required for OAuth (Google) with deep-link redirects.
 * - Sessions persist in AsyncStorage (localStorage on the web).
 */
export const supabase: SupabaseClient | null = env
  ? createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
        flowType: "pkce",
      },
    })
  : null;

/** Use inside features: throws a clear error if the app is misconfigured. */
export function getSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

// On native, refresh tokens only while the app is in the foreground.
if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
