/**
 * Turns errors from Supabase, the network or validation into one short,
 * friendly sentence for the UI. Raw messages are logged, never shown.
 */
const KNOWN_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "That email and password don't match. Please try again."],
  [/user already registered/i, "An account with this email already exists. Try signing in."],
  [/email not confirmed/i, "Please confirm your email first. Check your inbox for the link."],
  [/password should be at least/i, "Your password needs at least 8 characters."],
  [/rate limit|too many requests/i, "Too many attempts. Please wait a minute and try again."],
  [
    /error sending (confirmation|recovery|magic link|invite) email/i,
    "We couldn't send the email just now. Please try again in a few minutes.",
  ],
  [
    /provider is not enabled|unsupported provider/i,
    "This sign-in option isn't available yet. Use your email instead.",
  ],
  [/should be different from the old password/i, "Choose a password you haven't used before."],
  [
    /code verifier|auth code|flow state|otp_expired|link is invalid or has expired/i,
    "This link has expired or was opened on another device. Sign in, or request a new link.",
  ],
  [
    /network|fetch failed|failed to fetch/i,
    "You seem to be offline. Check your connection and try again.",
  ],
  [/user cancel|canceled|cancelled/i, ""],
];

/** An error whose message was written for users (e.g. from our Edge Functions). */
export class UserFacingError extends Error {
  override name = "UserFacingError";
}

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function toUserMessage(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  for (const [pattern, friendly] of KNOWN_MESSAGES) {
    if (pattern.test(message)) return friendly;
  }
  return GENERIC_ERROR;
}

/** True when the user simply cancelled (e.g. closed the Apple sheet): show nothing. */
export const isCancellation = (error: unknown): boolean => toUserMessage(error) === "";
