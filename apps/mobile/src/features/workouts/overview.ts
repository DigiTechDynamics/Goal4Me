import type { BuiltWorkout, ExerciseInfo, WorkoutPhase } from "@goal4me/core";
import { MOTIONS } from "./motion/motions";

/**
 * Turns a built workout (a flat list of timed steps, with every round spelled
 * out) into what the overview screen shows: each exercise once per phase with
 * its target and rounds, the muscles worked and any equipment needed.
 */
export interface OverviewItem {
  exercise: ExerciseInfo;
  /** "12 reps" or "30 sec". */
  target: string;
  rounds: number;
  substituted: boolean;
}

export interface OverviewGroup {
  phase: WorkoutPhase;
  label: string;
  items: OverviewItem[];
}

export interface WorkoutOverview {
  groups: OverviewGroup[];
  /** Most-worked first, e.g. ["Quads", "Glutes", "Core"]. */
  muscles: string[];
  /** e.g. ["a wall", "a sturdy chair"]; empty means no equipment. */
  equipment: string[];
  exerciseCount: number;
}

const PHASE_LABEL: Record<WorkoutPhase, string> = {
  warmup: "Warm-up",
  main: "Workout",
  cooldown: "Cool-down",
};
const PHASE_ORDER: WorkoutPhase[] = ["warmup", "main", "cooldown"];
const EQUIPMENT = { wall: "a wall", chair: "a sturdy chair" } as const;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function targetLabel(step: { reps: number | null; seconds: number | null }): string {
  return step.reps !== null ? `${step.reps} reps` : `${step.seconds ?? 0} sec`;
}

export function summariseWorkout(workout: BuiltWorkout): WorkoutOverview {
  const groups = new Map<WorkoutPhase, Map<string, OverviewItem>>();
  const muscleCounts = new Map<string, number>();
  const equipment = new Set<string>();

  for (const step of workout.steps) {
    if (step.kind !== "exercise") continue;
    const phase = groups.get(step.phase) ?? new Map<string, OverviewItem>();
    groups.set(step.phase, phase);
    if (phase.has(step.exercise.id)) continue;
    phase.set(step.exercise.id, {
      exercise: step.exercise,
      target: targetLabel(step),
      rounds: step.totalRounds,
      substituted: step.substituted,
    });
    // Muscles count once per distinct exercise; warm-ups and stretches don't
    // define what a workout "works", so only the main block counts.
    if (step.phase === "main") {
      for (const muscle of step.exercise.details?.muscles ?? []) {
        muscleCounts.set(muscle, (muscleCounts.get(muscle) ?? 0) + 1);
      }
    }
    const prop = MOTIONS[step.exercise.slug]?.prop;
    if (prop) equipment.add(EQUIPMENT[prop.kind]);
  }

  const ordered = PHASE_ORDER.flatMap((phase) => {
    const items = groups.get(phase);
    return items ? [{ phase, label: PHASE_LABEL[phase], items: [...items.values()] }] : [];
  });
  return {
    groups: ordered,
    muscles: [...muscleCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([muscle]) => capitalise(muscle)),
    equipment: [...equipment],
    exerciseCount: ordered.reduce((sum, g) => sum + g.items.length, 0),
  };
}
