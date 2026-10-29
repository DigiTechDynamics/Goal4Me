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
    /network|fetch failed|failed to fetch/i,
    "You seem to be offline. Check your connection and try again.",
  ],
  [/user cancel|canceled|cancelled/i, ""],
];

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function toUserMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  for (const [pattern, friendly] of KNOWN_MESSAGES) {
    if (pattern.test(message)) return friendly;
  }
  return GENERIC_ERROR;
}

/** True when the user simply cancelled (e.g. closed the Apple sheet): show nothing. */
export const isCancellation = (error: unknown): boolean => toUserMessage(error) === "";
