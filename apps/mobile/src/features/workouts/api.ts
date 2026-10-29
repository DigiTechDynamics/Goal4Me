import type {
  ExerciseInfo,
  FitnessLevel,
  Limitation,
  PlanItem,
  WorkoutPhase,
  WorkoutRating,
} from "@goal4me/core";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";

/** Exercise library + content change rarely: cache for a day (and offline, see persistence). */
const CONTENT_STALE_MS = 24 * 60 * 60 * 1000;

export const workoutKeys = {
  library: ["exercise-library"] as const,
  plan: (userId: string) => ["program-plan", userId] as const,
  day: (dayId: string) => ["program-day", dayId] as const,
};

/**
 * Plain objects and arrays only (no Map/Set): query results are persisted
 * to device storage as JSON for offline use.
 */
export interface ExerciseLibrary {
  byId: Record<string, ExerciseInfo>;
  /** Safe stand-in exercise ids, resolved from their slugs. */
  fallbackIds: string[];
}

/** Mirrors FALLBACK_SLUGS in @goal4me/content (kept here so the app bundle doesn't ship the seed). */
const FALLBACK_SLUGS = [
  "dead-bug",
  "glute-bridge",
  "wall-angels",
  "side-leg-raise",
  "calf-raise",
  "forearm-plank",
];

interface ExerciseRow {
  id: string;
  slug: string;
  name: string;
  difficulty: number;
  met: number | string;
  contraindications: string[];
  easier_id: string | null;
  video_path: string | null;
  form_tips: string[];
}

async function fetchLibrary(): Promise<ExerciseLibrary> {
  const { data, error } = await getSupabase()
    .from("exercises")
    .select("id, slug, name, difficulty, met, contraindications, easier_id, video_path, form_tips")
    .eq("is_published", true);
  if (error) throw error;
  const rows = (data ?? []) as ExerciseRow[];
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
  return {
    byId: Object.fromEntries(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          name: row.name,
          difficulty: row.difficulty,
          met: Number(row.met),
          contraindications: row.contraindications,
          easierId: row.easier_id,
          videoPath: row.video_path,
          formTips: row.form_tips,
        },
      ]),
    ),
    fallbackIds: FALLBACK_SLUGS.flatMap((slug) => bySlug.get(slug) ?? []),
  };
}

export function useExerciseLibrary() {
  return useQuery({
    queryKey: workoutKeys.library,
    queryFn: fetchLibrary,
    staleTime: CONTENT_STALE_MS,
  });
}

export interface ProgramPlan {
  userProgramId: string;
  programName: string;
  durationDays: number;
  /** Premium programmes lock every workout after the first 3 for free users. */
  programIsPremium: boolean;
  currentDay: number;
  intensityFactor: number;
  completedAt: string | null;
  days: { id: string; dayNumber: number; title: string; isRestDay: boolean }[];
  completedDayIds: string[];
  /** The user's latest workout ratings, oldest first (for auto-progression). */
  recentRatings: WorkoutRating[];
  /** Personalisation inputs from the user's current goal. */
  fitnessLevel: FitnessLevel;
  limitations: Limitation[];
  minutesPerSession: number;
}

async function fetchPlan(userId: string): Promise<ProgramPlan | null> {
  const db = getSupabase();
  const [active, goal] = await Promise.all([
    db
      .from("user_programs")
      .select(
        "id, program_id, current_day, intensity_factor, completed_at, programs(name, duration_days, is_premium)",
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    db
      .from("goals")
      .select("fitness_level, limitations, minutes_per_session")
      .eq("user_id", userId)
      .eq("is_current", true)
      .maybeSingle(),
  ]);
  if (active.error) throw active.error;
  if (goal.error) throw goal.error;
  if (!active.data || !goal.data) return null;

  const program = active.data.programs as unknown as {
    name: string;
    duration_days: number;
    is_premium: boolean;
  } | null;
  if (!program) return null;

  const [days, sessions] = await Promise.all([
    db
      .from("program_days")
      .select("id, day_number, title, is_rest_day")
      .eq("program_id", active.data.program_id)
      .order("day_number"),
    db
      .from("workout_sessions")
      .select("program_day_id, rating")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(500),
  ]);
  if (days.error) throw days.error;
  if (sessions.error) throw sessions.error;

  return {
    userProgramId: active.data.id,
    programName: program.name,
    durationDays: program.duration_days,
    programIsPremium: program.is_premium,
    currentDay: active.data.current_day,
    intensityFactor: Number(active.data.intensity_factor),
    completedAt: active.data.completed_at,
    days: (days.data ?? []).map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      title: d.title,
      isRestDay: d.is_rest_day,
    })),
    completedDayIds: [
      ...new Set(
        (sessions.data ?? []).flatMap((s) =>
          s.program_day_id ? [s.program_day_id as string] : [],
        ),
      ),
    ],
    recentRatings: (sessions.data ?? [])
      .slice(0, 2)
      .flatMap((s) => (s.rating ? [s.rating as WorkoutRating] : []))
      .reverse(),
    fitnessLevel: goal.data.fitness_level,
    limitations: goal.data.limitations as Limitation[],
    minutesPerSession: goal.data.minutes_per_session,
  };
}

export function useProgramPlan(userId: string) {
  return useQuery({ queryKey: workoutKeys.plan(userId), queryFn: () => fetchPlan(userId) });
}

/** The next training day at or after the user's current day (skipping rest days). */
export function nextWorkoutDay(plan: ProgramPlan) {
  return plan.days.find((d) => !d.isRestDay && d.dayNumber >= plan.currentDay) ?? null;
}

async function fetchDayItems(dayId: string): Promise<{ title: string; items: PlanItem[] }> {
  const { data, error } = await getSupabase()
    .from("program_days")
    .select(
      "title, program_items(position, exercise_id, phase, rounds, target_reps, target_seconds, rest_seconds)",
    )
    .eq("id", dayId)
    .single();
  if (error) throw error;
  const items = (data.program_items ?? []) as {
    position: number;
    exercise_id: string;
    phase: WorkoutPhase;
    rounds: number;
    target_reps: number | null;
    target_seconds: number | null;
    rest_seconds: number;
  }[];
  return {
    title: data.title,
    items: items.map((i) => ({
      position: i.position,
      exerciseId: i.exercise_id,
      phase: i.phase,
      rounds: i.rounds,
      targetReps: i.target_reps,
      targetSeconds: i.target_seconds,
      restSeconds: i.rest_seconds,
    })),
  };
}

export function useProgramDay(dayId: string) {
  return useQuery({
    queryKey: workoutKeys.day(dayId),
    queryFn: () => fetchDayItems(dayId),
    staleTime: CONTENT_STALE_MS,
  });
}
