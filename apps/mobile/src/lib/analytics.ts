import PostHog from "posthog-react-native";
import type { PlanId } from "@goal4me/schemas";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Product analytics (PostHog, EU cloud). Off unless EXPO_PUBLIC_POSTHOG_KEY
 * is set, and users can opt out in Profile.
 *
 * Privacy rules: events carry no health or money values (no weights, BMI,
 * amounts), the person is identified only by their opaque user id, and IP
 * geolocation is disabled. Each event below answers a product question, so
 * nothing is tracked "just in case".
 */
export type AnalyticsEvent =
  | { name: "onboarding_completed"; props: { goal: string } }
  | { name: "signed_up"; props: { method: "email" | "apple" | "google" } }
  | { name: "workout_completed"; props: { day: number; rating: string } }
  | { name: "weight_logged"; props: Record<string, never> }
  | { name: "lesson_completed"; props: { track: string } }
  | { name: "budget_created"; props: Record<string, never> }
  | { name: "paywall_viewed"; props: { reason: string; platform: string } }
  | { name: "checkout_started"; props: { plan: PlanId; method: string } }
  | { name: "premium_unlocked"; props: { store: string } }
  | { name: "health_connected"; props: { platform: string } };

const key = env?.EXPO_PUBLIC_POSTHOG_KEY;

const client = key
  ? new PostHog(key, {
      host: env?.EXPO_PUBLIC_POSTHOG_HOST,
      disableGeoip: true,
      personProfiles: "identified_only",
      captureAppLifecycleEvents: true,
    })
  : null;

export function track<E extends AnalyticsEvent>(name: E["name"], props: E["props"]): void {
  if (!client) return;
  try {
    client.capture(name, props);
  } catch (error) {
    // Analytics must never break the app.
    logger.warn("analytics capture failed", { event: name, error: String(error) });
  }
}

/** Links events to the account (opaque id only), or forgets the user on sign-out. */
export function identifyUser(userId: string | null): void {
  if (!client) return;
  if (userId) client.identify(userId);
  else client.reset();
}

export const analyticsAvailable = !!client;

export const analyticsOptedOut = (): boolean => client?.optedOut ?? true;

export async function setAnalyticsOptOut(optOut: boolean): Promise<void> {
  if (!client) return;
  await (optOut ? client.optOut() : client.optIn());
}
