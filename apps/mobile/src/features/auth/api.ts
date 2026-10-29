import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { clearLocalData } from "@/features/account/localData";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import type { SignInInput, SignUpInput } from "./validation";

/**
 * Where email links and OAuth send the user back to: goal4me://auth-callback
 * in the apps, http(s)://<host>/auth-callback on the web. `next` tells the
 * callback screen where to go once signed in.
 */
const redirectTo = Linking.createURL("auth-callback");
const recoveryRedirectTo = Linking.createURL("auth-callback", {
  queryParams: { next: "new-password" },
});

export interface SignUpResult {
  /** False when the project requires email confirmation before first sign-in. */
  signedIn: boolean;
}

export async function signUpWithEmail({ email, password }: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  logger.info("Account created");
  return { signedIn: data.session !== null };
}

export async function signInWithEmail({ email, password }: SignInInput): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: recoveryRedirectTo,
  });
  if (error) throw error;
}

/**
 * Finishes an email link or OAuth redirect. In the apps the PKCE code is
 * exchanged here; on the web the Supabase client already exchanged it while
 * starting up (detectSessionInUrl), so we only check that a session exists.
 */
export async function completeAuthRedirect(code: string | null): Promise<void> {
  const supabase = getSupabase();
  if (Platform.OS !== "web" && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("link is invalid or has expired");
}

/** Sets a new password for the signed-in user (after a reset link). */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw error;
  logger.info("Password changed");
}

export interface AuthProviders {
  google: boolean;
  apple: boolean;
}

/**
 * Which social sign-ins the Supabase project has switched on, from its public
 * settings endpoint, so the app never offers a button that can only fail.
 */
export async function fetchAuthProviders(): Promise<AuthProviders> {
  if (!env) throw new Error("Supabase is not configured");
  const response = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY },
  });
  if (!response.ok) throw new Error(`Auth settings request failed (${response.status})`);
  const body = (await response.json()) as { external?: Record<string, unknown> };
  return { google: body.external?.google === true, apple: body.external?.apple === true };
}

/** Native "Sign in with Apple" (iOS only). Apple requires it whenever Google is offered. */
export async function signInWithApple(): Promise<void> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error("Apple did not return an identity token");
  const { error } = await getSupabase().auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  if (error) throw error;
}

/**
 * Google sign-in through Supabase OAuth.
 * Web: a normal redirect; the client picks the session up from the URL.
 * Native: an in-app browser session, then the PKCE code is exchanged.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();

  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") throw new Error("User cancelled");

  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new Error("Sign-in did not return an authorisation code");
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

/** Signs out everywhere this session is used and wipes cached personal data. */
export async function signOut(): Promise<void> {
  const db = getSupabase();
  const userId = (await db.auth.getSession()).data.session?.user.id ?? null;
  const { error } = await db.auth.signOut();
  if (error) throw error;
  await clearLocalData({ userId, dropUnsyncedWorkouts: false });
}
