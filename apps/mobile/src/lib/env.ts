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
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

export const env: Env | null = parsed.success ? parsed.data : null;

/** Human-readable list of configuration problems (empty when valid). */
export const envErrors: string[] = parsed.success
  ? []
  : parsed.error.issues.map((issue) => issue.message);
