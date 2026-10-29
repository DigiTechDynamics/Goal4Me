import {
  buildRunPlan,
  rebaseProgress,
  RUN_LEVELS,
  RunPlanError,
  type RunLevel,
  type RunPlan,
  type RunSettings,
} from "@goal4me/core";
import { runSettingsSchema } from "@goal4me/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { UserFacingError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";

/**
 * Running data. Plans are stored as settings only; the week-by-week plan is
 * rebuilt on the device by @goal4me/core, so it works offline and a change
 * of settings is instant.
 */
export const runningKeys = {
  level: (userId: string) => ["runner-level", userId] as const,
  plan: (userId: string) => ["run-plan", userId] as const,
  history: (userId: string) => ["run-history", userId] as const,
  guides: (userId: string) => ["run-guides", userId] as const,
  guide: (slug: string) => ["run-guide", slug] as const,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// --- Runner level --------------------------------------------------------------

export function useRunnerLevel(userId: string) {
  return useQuery({
    queryKey: runningKeys.level(userId),
    queryFn: async (): Promise<RunLevel | null> => {
      const { data, error } = await getSupabase()
        .from("profiles")
        .select("runner_level")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      const level = data?.runner_level as RunLevel | null | undefined;
      return level && RUN_LEVELS.includes(level) ? level : null;
    },
  });
}

export function useSetRunnerLevel(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (level: RunLevel) => {
      const { error } = await getSupabase()
        .from("profiles")
        .update({ runner_level: level })
        .eq("user_id", userId);
      if (error) throw error;
      track("runner_level_set", { level });
    },
    onSuccess: (_, level) => client.setQueryData(runningKeys.level(userId), level),
  });
}

// --- Plan ------------------------------------------------------------------------

export interface ActiveRunPlan {
  id: string;
  settings: RunSettings;
  intensity: number;
  completedRuns: number;
  /** The generated plan; null if the stored settings no longer build one. */
  plan: RunPlan | null;
}

/** The stored row → settings; invalid JSON (e.g. a hand edit) is treated as "no plan". */
function toActivePlan(row: {
  id: string;
  settings: unknown;
  intensity: number | string;
  completed_runs: number;
}): ActiveRunPlan | null {
  const parsed = runSettingsSchema.safeParse(row.settings);
  if (!parsed.success) {
    logger.warn("stored run settings are invalid", { planId: row.id });
    return null;
  }
  const settings = parsed.data;
  const intensity = Number(row.intensity);
  let plan: RunPlan | null = null;
  try {
    plan = buildRunPlan(settings, intensity);
  } catch (error) {
    logger.warn("stored run plan no longer builds", { planId: row.id, error: String(error) });
  }
  return { id: row.id, settings, intensity, completedRuns: row.completed_runs, plan };
}

export function useRunPlan(userId: string) {
  return useQuery({
    queryKey: runningKeys.plan(userId),
    queryFn: async (): Promise<ActiveRunPlan | null> => {
      const { data, error } = await getSupabase()
        .from("run_plans")
        .select("id, settings, intensity, completed_runs")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data ? toActivePlan(data) : null;
    },
  });
}

/**
 * Saves the runner's settings. Same programme: the plan is updated in place
 * and progress is kept (rebased to the same week). New programme: the old
 * plan is archived and a fresh one starts.
 */
export function useSaveRunPlan(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      settings,
      current,
    }: {
      settings: RunSettings;
      current: ActiveRunPlan | null;
    }): Promise<void> => {
      const valid = runSettingsSchema.parse(settings);
      let next: RunPlan;
      try {
        next = buildRunPlan(valid, current?.intensity ?? 1);
      } catch (error) {
        if (error instanceof RunPlanError) throw new UserFacingError(error.message);
        throw error;
      }
      const db = getSupabase();
      if (current && current.settings.program === valid.program) {
        const completed = current.plan
          ? rebaseProgress(current.plan, current.completedRuns, next)
          : 0;
        const { error } = await db
          .from("run_plans")
          .update({ settings: valid, completed_runs: completed })
          .eq("id", current.id);
        if (error) throw error;
      } else {
        if (current) {
          const { error } = await db
            .from("run_plans")
            .update({ is_active: false })
            .eq("id", current.id);
          if (error) throw error;
        }
        const { error } = await db
          .from("run_plans")
          .insert({ user_id: userId, program: valid.program, settings: valid });
        if (error) throw error;
      }
      track("run_plan_saved", {
        program: valid.program,
        days: valid.daysPerWeek,
        race: valid.raceDate !== null,
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: runningKeys.plan(userId) }),
  });
}

// --- History ------------------------------------------------------------------------

export interface RunLogEntry {
  id: string;
  runNumber: number;
  startedAt: string;
  durationSec: number;
  distanceM: number | null;
  effort: string;
}

export interface RunHistory {
  recent: RunLogEntry[];
  /** Totals for the last 7 days. */
  week: { runs: number; seconds: number; meters: number };
  /** Every run ever logged. */
  totalRuns: number;
}

export function useRunHistory(userId: string) {
  return useQuery({
    queryKey: runningKeys.history(userId),
    queryFn: async (): Promise<RunHistory> => {
      const { data, error, count } = await getSupabase()
        .from("run_sessions")
        .select("id, run_number, started_at, duration_s, distance_m, effort", { count: "exact" })
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      const recent = (data ?? []).map((row) => ({
        id: row.id,
        runNumber: row.run_number,
        startedAt: row.started_at,
        durationSec: row.duration_s,
        distanceM: row.distance_m,
        effort: row.effort,
      }));
      const weekAgo = Date.now() - 7 * DAY_MS;
      const thisWeek = recent.filter((r) => Date.parse(r.startedAt) >= weekAgo);
      return {
        recent,
        week: {
          runs: thisWeek.length,
          seconds: thisWeek.reduce((sum, r) => sum + r.durationSec, 0),
          meters: thisWeek.reduce((sum, r) => sum + (r.distanceM ?? 0), 0),
        },
        totalRuns: count ?? recent.length,
      };
    },
  });
}

// --- Guides ---------------------------------------------------------------------------

export interface RunGuideSummary {
  id: string;
  slug: string;
  level: RunLevel;
  position: number;
  title: string;
  isPremium: boolean;
}

/**
 * Every published guide (titles only) in ladder order. Reads the catalogue
 * view, which lists premium guides to free users so they can see the path.
 */
export function useRunGuides(userId: string) {
  return useQuery({
    queryKey: runningKeys.guides(userId),
    staleTime: DAY_MS,
    queryFn: async (): Promise<RunGuideSummary[]> => {
      const { data, error } = await getSupabase()
        .from("run_guide_catalog")
        .select("id, slug, level, position, title, is_premium");
      if (error) throw error;
      return (data ?? [])
        .filter((row): row is typeof row & { level: RunLevel } => RUN_LEVELS.includes(row.level))
        .map((row) => ({
          id: row.id,
          slug: row.slug,
          level: row.level,
          position: row.position,
          title: row.title,
          isPremium: row.is_premium,
        }))
        .sort(
          (a, b) =>
            RUN_LEVELS.indexOf(a.level) - RUN_LEVELS.indexOf(b.level) || a.position - b.position,
        );
    },
  });
}

export interface RunGuide {
  slug: string;
  level: RunLevel;
  title: string;
  body: string;
  tryThis: string | null;
}

/** Null when the guide is premium and the user isn't (the database hides it). */
export function useRunGuide(slug: string) {
  return useQuery({
    queryKey: runningKeys.guide(slug),
    staleTime: DAY_MS,
    queryFn: async (): Promise<RunGuide | null> => {
      const { data, error } = await getSupabase()
        .from("run_guides")
        .select("slug, level, title, body_md, try_this")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        slug: data.slug,
        level: data.level as RunLevel,
        title: data.title,
        body: data.body_md,
        tryThis: data.try_this,
      };
    },
  });
}
