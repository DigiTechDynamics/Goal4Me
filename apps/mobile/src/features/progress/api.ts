import { liveStreak, type LiveStreak, type MeasurementKey } from "@goal4me/core";
import type { BodyMetricInput } from "@goal4me/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import { localToday } from "@/lib/format";

/**
 * Data access for the Progress tab: weigh-ins, measurements, streak, badges
 * and water. Every write goes through an RPC so it is validated server-side
 * (see 20261028040000_progress_and_account.sql).
 */
export const progressKeys = {
  metrics: (userId: string) => ["body-metrics", userId] as const,
  streak: (userId: string) => ["streak", userId] as const,
  water: (userId: string, date: string) => ["water", userId, date] as const,
};

/** Two years of daily entries is the most a chart ever needs. */
const MAX_METRIC_ROWS = 730;

export interface BodyMetric extends Partial<Record<MeasurementKey, number | null>> {
  measuredOn: string;
  weightKg: number;
}

interface MetricRow {
  measured_on: string;
  weight_kg: number | string;
  waist_cm: number | string | null;
  hips_cm: number | string | null;
  chest_cm: number | string | null;
  arm_cm: number | string | null;
}

// Postgres numeric can arrive as a string; normalise to number | null.
const num = (value: number | string | null): number | null =>
  value === null ? null : Number(value);

/** Weigh-ins oldest → newest (the order charts and trend maths expect). */
async function fetchMetrics(userId: string): Promise<BodyMetric[]> {
  const { data, error } = await getSupabase()
    .from("body_metrics")
    .select("measured_on, weight_kg, waist_cm, hips_cm, chest_cm, arm_cm")
    .eq("user_id", userId)
    .order("measured_on", { ascending: false })
    .limit(MAX_METRIC_ROWS);
  if (error) throw error;
  return ((data ?? []) as MetricRow[])
    .map((row) => ({
      measuredOn: row.measured_on,
      weightKg: Number(row.weight_kg),
      waistCm: num(row.waist_cm),
      hipsCm: num(row.hips_cm),
      chestCm: num(row.chest_cm),
      armCm: num(row.arm_cm),
    }))
    .reverse();
}

export function useBodyMetrics(userId: string) {
  return useQuery({ queryKey: progressKeys.metrics(userId), queryFn: () => fetchMetrics(userId) });
}

export function useLogBodyMetric(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: BodyMetricInput) => {
      const { error } = await getSupabase().rpc("log_body_metric", {
        p_id: input.id,
        p_measured_on: input.measuredOn,
        p_weight_kg: input.weightKg,
        p_waist_cm: input.waistCm ?? null,
        p_hips_cm: input.hipsCm ?? null,
        p_chest_cm: input.chestCm ?? null,
        p_arm_cm: input.armCm ?? null,
      });
      if (error) throw error;
    },
    // Today's BMI, targets and goal date all depend on the latest weight.
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: progressKeys.metrics(userId) }),
        client.invalidateQueries({ queryKey: ["home-summary", userId] }),
      ]),
  });
}

export interface StreakSummary {
  streak: LiveStreak;
  earned: { badge: string; earnedAt: string }[];
}

async function fetchStreak(userId: string): Promise<StreakSummary> {
  const db = getSupabase();
  const [streak, badges] = await Promise.all([
    db
      .from("streaks")
      .select("current_days, best_days, last_active_on, freezes_left, freeze_week")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("achievements").select("badge, earned_at").eq("user_id", userId),
  ]);
  if (streak.error) throw streak.error;
  if (badges.error) throw badges.error;
  const s = streak.data;
  return {
    streak: liveStreak(
      s
        ? {
            currentDays: s.current_days,
            bestDays: s.best_days,
            lastActiveOn: s.last_active_on,
            freezesLeft: s.freezes_left,
            freezeWeek: s.freeze_week,
          }
        : null,
      localToday(),
    ),
    earned: (badges.data ?? []).map((row) => ({ badge: row.badge, earnedAt: row.earned_at })),
  };
}

export function useStreak(userId: string) {
  return useQuery({ queryKey: progressKeys.streak(userId), queryFn: () => fetchStreak(userId) });
}

export function useWater(userId: string, date: string) {
  return useQuery({
    queryKey: progressKeys.water(userId, date),
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("daily_logs")
        .select("water_ml")
        .eq("user_id", userId)
        .eq("log_date", date)
        .maybeSingle();
      if (error) throw error;
      return data?.water_ml ?? 0;
    },
  });
}

/**
 * Adds (or removes) water with an optimistic update, so taps feel instant
 * on slow mobile data. The server returns the authoritative total.
 */
export function useAddWater(userId: string, date: string) {
  const client = useQueryClient();
  const key = progressKeys.water(userId, date);
  return useMutation({
    mutationFn: async (deltaMl: number) => {
      const { data, error } = await getSupabase().rpc("add_water", {
        p_log_date: date,
        p_delta_ml: deltaMl,
      });
      if (error) throw error;
      return data as number;
    },
    onMutate: async (deltaMl) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<number>(key) ?? 0;
      client.setQueryData(key, Math.min(10_000, Math.max(0, previous + deltaMl)));
      return { previous };
    },
    onError: (_error, _delta, context) => {
      if (context) client.setQueryData(key, context.previous);
    },
    onSuccess: (total) => client.setQueryData(key, total),
  });
}
