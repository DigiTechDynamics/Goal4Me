import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import type { SignInInput, SignUpInput } from "./validation";

/** Deep link the auth provider sends the user back to (goal4me://auth-callback). */
const redirectTo = Linking.createURL("auth-callback");

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
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
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

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}
