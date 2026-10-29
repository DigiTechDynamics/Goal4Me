import { useQuery } from "@tanstack/react-query";
import type { ActivityLevel, FitnessLevel, Goal, Sex } from "@goal4me/core";
import { getSupabase } from "@/lib/supabase";

export interface HomeSummary {
  profile: {
    displayName: string | null;
    sex: Sex | null;
    birthDate: string | null;
    heightCm: number | null;
    units: "metric" | "imperial";
    country: string | null;
    currency: string | null;
  };
  goal: {
    goal: Goal;
    targetWeightKg: number;
    activity: ActivityLevel;
    fitnessLevel: FitnessLevel;
    daysPerWeek: number;
    minutesPerSession: number;
    moneyGoal: string | null;
  } | null;
  weights: { measuredOn: string; weightKg: number }[];
  program: { name: string; currentDay: number; durationDays: number } | null;
  streak: { currentDays: number; bestDays: number } | null;
}

/**
 * Loads everything the signed-in tabs need in parallel. RLS guarantees each
 * query only returns the current user's rows; we still filter by user id so
 * Postgres can use the (user_id, …) indexes.
 */
async function fetchHomeSummary(userId: string): Promise<HomeSummary> {
  const db = getSupabase();
  const [profile, goal, weights, program, streak] = await Promise.all([
    db
      .from("profiles")
      .select("display_name, sex, birth_date, height_cm, units, country, currency")
      .eq("user_id", userId)
      .single(),
    db
      .from("goals")
      .select(
        "goal, target_weight_kg, activity, fitness_level, days_per_week, minutes_per_session, money_goal",
      )
      .eq("user_id", userId)
      .eq("is_current", true)
      .maybeSingle(),
    db
      .from("body_metrics")
      .select("measured_on, weight_kg")
      .eq("user_id", userId)
      .order("measured_on", { ascending: false })
      .limit(30),
    db
      .from("user_programs")
      .select("current_day, programs(name, duration_days)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    db.from("streaks").select("current_days, best_days").eq("user_id", userId).maybeSingle(),
  ]);

  const firstError = profile.error ?? goal.error ?? weights.error ?? program.error ?? streak.error;
  if (firstError) throw firstError;

  const p = profile.data;
  if (!p) throw new Error("Profile not found");
  const programRow = program.data as {
    current_day: number;
    programs: { name: string; duration_days: number } | null;
  } | null;

  return {
    profile: {
      displayName: p.display_name,
      sex: p.sex,
      birthDate: p.birth_date,
      // Postgres numeric arrives as a string or number depending on precision; normalise.
      heightCm: p.height_cm === null ? null : Number(p.height_cm),
      units: p.units,
      country: p.country,
      currency: p.currency,
    },
    goal: goal.data
      ? {
          goal: goal.data.goal,
          targetWeightKg: Number(goal.data.target_weight_kg),
          activity: goal.data.activity,
          fitnessLevel: goal.data.fitness_level,
          daysPerWeek: goal.data.days_per_week,
          minutesPerSession: goal.data.minutes_per_session,
          moneyGoal: goal.data.money_goal,
        }
      : null,
    weights: (weights.data ?? []).map((row) => ({
      measuredOn: row.measured_on,
      weightKg: Number(row.weight_kg),
    })),
    program: programRow?.programs
      ? {
          name: programRow.programs.name,
          currentDay: programRow.current_day,
          durationDays: programRow.programs.duration_days,
        }
      : null,
    streak: streak.data
      ? { currentDays: streak.data.current_days, bestDays: streak.data.best_days }
      : null,
  };
}

export function useHomeSummary(userId: string) {
  return useQuery({
    queryKey: ["home-summary", userId],
    queryFn: () => fetchHomeSummary(userId),
  });
}

/** Whole years between a birth date and today. */
export function ageFromBirthDate(birthDate: string, today = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number) as [number, number, number];
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d))
    age -= 1;
  return age;
}
