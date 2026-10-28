import { z } from "zod";

/**
 * Public runtime configuration. Expo inlines EXPO_PUBLIC_* variables at
 * build time, so they must be referenced by their full literal name.
 * Validation happens once at start-up: a missing key shows a clear
 * configuration screen instead of failing later in a confusing way.
 */
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url("EXPO_PUBLIC_SUPABASE_URL must be a URL"),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "EXPO_PUBLIC_SUPABASE_ANON_KEY is missing"),
  // Optional until exercise videos are licensed; without it the player shows illustrated cards.
  EXPO_PUBLIC_VIDEO_CDN_URL: z.string().url().optional(),
  // RevenueCat public SDK keys (App Store / Play subscriptions). Optional until
  // the store accounts exist; without them the native paywall says so.
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().startsWith("appl_").optional(),
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: z.string().startsWith("goog_").optional(),
  // Monitoring is optional: without these keys nothing is sent anywhere.
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  EXPO_PUBLIC_POSTHOG_KEY: z.string().startsWith("phc_").optional(),
  // PostHog's EU cloud by default (GDPR / UK GDPR / POPIA friendly).
  EXPO_PUBLIC_POSTHOG_HOST: z.string().url().default("https://eu.i.posthog.com"),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_VIDEO_CDN_URL: process.env.EXPO_PUBLIC_VIDEO_CDN_URL || undefined,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || undefined,
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || undefined,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY || undefined,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST || undefined,
});

export const env: Env | null = parsed.success ? parsed.data : null;

/** Human-readable list of configuration problems (empty when valid). */
export const envErrors: string[] = parsed.success
  ? []
  : parsed.error.issues.map((issue) => issue.message);
