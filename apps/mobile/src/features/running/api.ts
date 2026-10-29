import {
  generateRunPlan,
  type RunGoal,
  type RunnerLevel,
  type RunWeek,
  type WorkoutRating,
} from "@goal4me/core";
import type { RunLogInput, RunPlanInput } from "@goal4me/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { getSupabase } from "@/lib/supabase";

export const runningKeys = {
  plan: (userId: string) => ["running-plan", userId] as const,
};

export interface RunLog {
  week: number;
  sessionIndex: number;
  completedOn: string;
  minutes: number | null;
  distanceKm: number | null;
  rating: WorkoutRating;
}

/** Plain objects only: persisted to device storage as JSON for offline use. */
export interface RunningPlan {
  id: string;
  level: RunnerLevel;
  goal: RunGoal;
  daysPerWeek: number;
  weeks: number;
  startedOn: string;
  logs: RunLog[];
}

async function fetchRunningPlan(userId: string): Promise<RunningPlan | null> {
  const db = getSupabase();
  const plan = await db
    .from("running_plans")
    .select("id, level, goal, days_per_week, weeks, started_on")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (plan.error) throw plan.error;
  if (!plan.data) return null;

  const logs = await db
    .from("run_logs")
    .select("week, session_index, completed_on, minutes, distance_m, rating")
    .eq("plan_id", plan.data.id)
    .order("created_at");
  if (logs.error) throw logs.error;

  return {
    id: plan.data.id,
    level: plan.data.level,
    goal: plan.data.goal,
    daysPerWeek: plan.data.days_per_week,
    weeks: plan.data.weeks,
    startedOn: plan.data.started_on,
    logs: (logs.data ?? []).map((l) => ({
      week: l.week,
      sessionIndex: l.session_index,
      completedOn: l.completed_on,
      minutes: l.minutes,
      distanceKm: l.distance_m === null ? null : l.distance_m / 1000,
      rating: l.rating as WorkoutRating,
    })),
  };
}

export function useRunningPlan(userId: string) {
  return useQuery({
    queryKey: runningKeys.plan(userId),
    queryFn: () => fetchRunningPlan(userId),
  });
}

/** The generated weeks for a stored plan (pure, so cheap to recompute). */
export function planWeeks(plan: RunningPlan): RunWeek[] {
  return generateRunPlan(plan);
}

export function useStartRunningPlan(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: RunPlanInput) => {
      const { error } = await getSupabase().rpc("start_running_plan", {
        p_id: input.id,
        p_level: input.level,
        p_goal: input.goal,
        p_days_per_week: input.daysPerWeek,
        p_weeks: input.weeks,
        p_started_on: input.startedOn,
      });
      if (error) throw error;
      track("running_plan_started", { level: input.level, goal: input.goal });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: runningKeys.plan(userId) }),
  });
}

export function useLogRun(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: RunLogInput) => {
      // Logging the same session again replaces the earlier entry.
      const { error } = await getSupabase()
        .from("run_logs")
        .upsert(
          {
            user_id: userId,
            plan_id: input.planId,
            week: input.week,
            session_index: input.sessionIndex,
            completed_on: input.completedOn,
            minutes: input.minutes ?? null,
            distance_m: input.distanceKm === undefined ? null : Math.round(input.distanceKm * 1000),
            rating: input.rating,
          },
          { onConflict: "plan_id,week,session_index" },
        );
      if (error) throw error;
      track("run_logged", { week: input.week, rating: input.rating });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: runningKeys.plan(userId) }),
  });
}

export function useUndoRun(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { planId: string; week: number; sessionIndex: number }) => {
      const { error } = await getSupabase()
        .from("run_logs")
        .delete()
        .eq("plan_id", input.planId)
        .eq("week", input.week)
        .eq("session_index", input.sessionIndex);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: runningKeys.plan(userId) }),
  });
}
