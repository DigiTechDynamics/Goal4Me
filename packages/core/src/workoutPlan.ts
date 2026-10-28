import type { FitnessLevel, Limitation } from "./types";
import { scaleTarget } from "./workout";

/**
 * Turns a programme day (as stored in the database) into the exact list of
 * steps the workout player runs: personalised for the user's limitations,
 * fitness level, session length and intensity factor.
 */

export type WorkoutPhase = "warmup" | "main" | "cooldown";

export interface ExerciseInfo {
  id: string;
  name: string;
  difficulty: number;
  met: number;
  contraindications: readonly string[];
  easierId: string | null;
  videoPath: string | null;
  formTips: readonly string[];
}

export interface PlanItem {
  position: number;
  exerciseId: string;
  phase: WorkoutPhase;
  rounds: number;
  targetReps: number | null;
  targetSeconds: number | null;
  restSeconds: number;
}

export interface ExerciseStep {
  kind: "exercise";
  exercise: ExerciseInfo;
  phase: WorkoutPhase;
  round: number;
  totalRounds: number;
  reps: number | null;
  seconds: number | null;
  /** True when the planned exercise was swapped for an easier/safer one. */
  substituted: boolean;
}

export interface RestStep {
  kind: "rest";
  seconds: number;
  /** The exercise coming up next, for the "Next:" preview. */
  next: ExerciseInfo;
}

export type WorkoutStep = ExerciseStep | RestStep;

export interface BuiltWorkout {
  steps: WorkoutStep[];
  /** Planned duration including rests, in seconds. */
  estimatedSec: number;
  /** Exercises dropped because no safe variation exists. */
  skipped: string[];
}

/** Highest exercise difficulty offered at each fitness level. */
const MAX_DIFFICULTY: Record<FitnessLevel, number> = {
  none: 2,
  beginner: 3,
  intermediate: 4,
  advanced: 5,
};

/** Average time per rep, used to estimate duration and calories of rep-based sets. */
export const SECONDS_PER_REP = 3;

/** Main-block rounds in the templates are written for a 15-minute session. */
const TEMPLATE_MINUTES = 15;

/**
 * Picks a safe variation: walks down the "easier" chain until the exercise
 * suits the user's limitations and level. Returns null if none does.
 */
export function resolveExercise(
  exerciseId: string,
  library: ReadonlyMap<string, ExerciseInfo>,
  limitations: readonly Limitation[],
  level: FitnessLevel,
): ExerciseInfo | null {
  const seen = new Set<string>();
  let current = library.get(exerciseId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const unsafe = current.contraindications.some((c) => limitations.includes(c as Limitation));
    const tooHard = current.difficulty > MAX_DIFFICULTY[level];
    if (!unsafe && !tooHard) return current;
    current = current.easierId ? library.get(current.easierId) : undefined;
  }
  return null;
}

export function buildWorkout(input: {
  items: readonly PlanItem[];
  library: ReadonlyMap<string, ExerciseInfo>;
  limitations: readonly Limitation[];
  level: FitnessLevel;
  intensityFactor: number;
  minutesPerSession: number;
  /**
   * Safe stand-ins (exercise ids, in order of preference) used when a
   * main-block exercise has no variation the user can do.
   */
  fallbacks?: readonly string[];
}): BuiltWorkout {
  const { library, limitations, level, intensityFactor, minutesPerSession, fallbacks = [] } = input;
  const phaseOrder: Record<WorkoutPhase, number> = { warmup: 0, main: 1, cooldown: 2 };
  const items = [...input.items].sort(
    (a, b) => phaseOrder[a.phase] - phaseOrder[b.phase] || a.position - b.position,
  );
  const roundScale = minutesPerSession / TEMPLATE_MINUTES;

  // Resolve each item to a safe exercise first.
  const resolved: { item: PlanItem; exercise: ExerciseInfo; substituted: boolean }[] = [];
  const skipped: string[] = [];
  const used = new Set<string>();
  for (const item of items) {
    let exercise = resolveExercise(item.exerciseId, library, limitations, level);
    // In the main block, a stand-in keeps the workout full instead of shrinking it.
    if (!exercise && item.phase === "main") {
      for (const id of fallbacks) {
        const candidate = resolveExercise(id, library, limitations, level);
        if (candidate && !used.has(candidate.id)) {
          exercise = candidate;
          break;
        }
      }
    }
    if (exercise) {
      used.add(exercise.id);
      resolved.push({ item, exercise, substituted: exercise.id !== item.exerciseId });
    } else {
      skipped.push(library.get(item.exerciseId)?.name ?? item.exerciseId);
    }
  }

  // Expand into steps. The main block runs as a circuit: every exercise once per round.
  const steps: WorkoutStep[] = [];
  const push = (entry: (typeof resolved)[number], round: number, totalRounds: number) => {
    const { item, exercise, substituted } = entry;
    // Warm-up and cool-down stay fixed; only the main block scales with intensity.
    const factor = item.phase === "main" ? intensityFactor : 1;
    steps.push({
      kind: "exercise",
      exercise,
      phase: item.phase,
      round,
      totalRounds,
      reps: item.targetReps === null ? null : scaleTarget(item.targetReps, factor),
      seconds: item.targetSeconds === null ? null : scaleTarget(item.targetSeconds, factor),
      substituted,
    });
    if (item.restSeconds > 0)
      steps.push({ kind: "rest", seconds: item.restSeconds, next: exercise });
  };

  const warmup = resolved.filter((r) => r.item.phase === "warmup");
  const main = resolved.filter((r) => r.item.phase === "main");
  const cooldown = resolved.filter((r) => r.item.phase === "cooldown");

  warmup.forEach((entry) => push(entry, 1, 1));
  const mainRounds = Math.min(5, Math.max(1, Math.round((main[0]?.item.rounds ?? 1) * roundScale)));
  for (let round = 1; round <= mainRounds; round++)
    main.forEach((entry) => push(entry, round, mainRounds));
  cooldown.forEach((entry) => push(entry, 1, 1));

  // Rest steps point at the exercise they FOLLOW while being built; re-point
  // each one at the exercise that comes next, and drop rests with nothing after.
  const finalSteps: WorkoutStep[] = [];
  steps.forEach((step, i) => {
    if (step.kind === "exercise") {
      finalSteps.push(step);
      return;
    }
    const upcoming = steps.slice(i + 1).find((s): s is ExerciseStep => s.kind === "exercise");
    if (upcoming) finalSteps.push({ ...step, next: upcoming.exercise });
  });

  const estimatedSec = finalSteps.reduce(
    (total, step) =>
      total +
      (step.kind === "rest" ? step.seconds : (step.seconds ?? (step.reps ?? 0) * SECONDS_PER_REP)),
    0,
  );

  return { steps: finalSteps, estimatedSec, skipped };
}

/** Average MET of the exercise time, for the calorie estimate after a workout. */
export function averageMet(steps: readonly WorkoutStep[]): number {
  let weighted = 0;
  let total = 0;
  for (const step of steps) {
    if (step.kind !== "exercise") continue;
    const seconds = step.seconds ?? (step.reps ?? 0) * SECONDS_PER_REP;
    weighted += step.exercise.met * seconds;
    total += seconds;
  }
  // Rest time counts at roughly standing-still effort.
  return total === 0 ? 1.5 : weighted / total;
}
