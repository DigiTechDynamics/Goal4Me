import type { BuiltWorkout, ExerciseInfo, WorkoutPhase, WorkoutStep } from "@goal4me/core";
import { describe, expect, it } from "vitest";
import { summariseWorkout, targetLabel } from "../overview";

const ex = (slug: string, muscles: string[]): ExerciseInfo => ({
  id: slug,
  slug,
  name: slug,
  difficulty: 1,
  met: 4,
  contraindications: [],
  easierId: null,
  videoPath: null,
  formTips: [],
  details: { description: "", muscles, steps: [], breathing: "", mistakes: [], benefit: "" },
});

const step = (
  exercise: ExerciseInfo,
  phase: WorkoutPhase,
  round: number,
  totalRounds: number,
  reps: number | null,
): WorkoutStep => ({
  kind: "exercise",
  exercise,
  phase,
  round,
  totalRounds,
  reps,
  seconds: reps === null ? 30 : null,
  substituted: false,
});

const squat = ex("squat", ["quads", "glutes"]);
const bridge = ex("glute-bridge", ["glutes", "hamstrings"]);
const march = ex("march-in-place", ["legs"]);
const dip = ex("chair-dip", ["triceps"]);
const wallSit = ex("wall-sit", ["quads"]);

const workout: BuiltWorkout = {
  estimatedSec: 600,
  skipped: [],
  steps: [
    step(march, "warmup", 1, 1, null),
    step(squat, "main", 1, 2, 12),
    { kind: "rest", seconds: 20, next: bridge },
    step(bridge, "main", 1, 2, 10),
    step(dip, "main", 1, 2, 8),
    step(squat, "main", 2, 2, 12),
    step(bridge, "main", 2, 2, 10),
    step(dip, "main", 2, 2, 8),
    step(wallSit, "cooldown", 1, 1, null),
  ],
};

describe("summariseWorkout", () => {
  const overview = summariseWorkout(workout);

  it("lists each exercise once per phase, in phase order, with its rounds", () => {
    expect(overview.groups.map((g) => g.label)).toEqual(["Warm-up", "Workout", "Cool-down"]);
    expect(overview.groups[1]?.items.map((i) => [i.exercise.slug, i.target, i.rounds])).toEqual([
      ["squat", "12 reps", 2],
      ["glute-bridge", "10 reps", 2],
      ["chair-dip", "8 reps", 2],
    ]);
    expect(overview.exerciseCount).toBe(5);
  });

  it("ranks main-block muscles by how many exercises work them", () => {
    expect(overview.muscles).toEqual(["Glutes", "Hamstrings", "Quads", "Triceps"]);
  });

  it("names the equipment the animations use", () => {
    expect(overview.equipment.sort()).toEqual(["a sturdy chair", "a wall"]);
  });

  it("labels reps and timed holds", () => {
    expect(targetLabel({ reps: 12, seconds: null })).toBe("12 reps");
    expect(targetLabel({ reps: null, seconds: 45 })).toBe("45 sec");
  });
});
