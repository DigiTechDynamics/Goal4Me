import { describe, expect, it } from "vitest";
import {
  averageMet,
  buildWorkout,
  resolveExercise,
  type ExerciseInfo,
  type PlanItem,
} from "../index";

const ex = (id: string, difficulty: number, extra: Partial<ExerciseInfo> = {}): ExerciseInfo => ({
  id,
  slug: id,
  name: id,
  difficulty,
  met: 5,
  contraindications: [],
  easierId: null,
  videoPath: null,
  formTips: [],
  ...extra,
});

const library = new Map<string, ExerciseInfo>(
  [
    ex("march", 1, { met: 3.5 }),
    ex("wall-push-up", 1, { contraindications: ["wrists"] }),
    ex("knee-push-up", 2, { contraindications: ["wrists"], easierId: "wall-push-up" }),
    ex("push-up", 3, { contraindications: ["wrists"], easierId: "knee-push-up", met: 8 }),
    ex("glute-bridge", 1),
    ex("squat", 2, { contraindications: ["knees"], easierId: "glute-bridge" }),
    ex("burpee", 5, { contraindications: ["knees", "wrists"] }),
    ex("stretch", 1, { met: 2.3 }),
  ].map((e) => [e.id, e]),
);

const item = (
  exerciseId: string,
  phase: PlanItem["phase"],
  position: number,
  rest = 20,
): PlanItem => ({
  position,
  exerciseId,
  phase,
  rounds: phase === "main" ? 2 : 1,
  targetReps: phase === "main" ? 10 : null,
  targetSeconds: phase === "main" ? null : 30,
  restSeconds: rest,
});

const day: PlanItem[] = [
  item("stretch", "cooldown", 1, 0),
  item("push-up", "main", 1),
  item("march", "warmup", 1, 0),
  item("squat", "main", 2),
];

describe("resolveExercise", () => {
  it("keeps exercises that suit the user", () => {
    expect(resolveExercise("push-up", library, [], "intermediate")?.id).toBe("push-up");
  });

  it("steps down to an easier variation for the user's level", () => {
    expect(resolveExercise("push-up", library, [], "none")?.id).toBe("knee-push-up");
  });

  it("swaps around limitations and drops exercises with no safe variation", () => {
    expect(resolveExercise("squat", library, ["knees"], "advanced")?.id).toBe("glute-bridge");
    expect(resolveExercise("push-up", library, ["wrists"], "advanced")).toBeNull();
  });
});

describe("buildWorkout", () => {
  const base = {
    items: day,
    library,
    limitations: [] as const,
    level: "intermediate" as const,
    intensityFactor: 1,
    minutesPerSession: 15,
  };

  it("orders warm-up, a main circuit by rounds, then cool-down", () => {
    const { steps } = buildWorkout(base);
    const names = steps
      .filter((s) => s.kind === "exercise")
      .map((s) => (s.kind === "exercise" ? `${s.exercise.id}#${s.round}` : ""));
    expect(names).toEqual(["march#1", "push-up#1", "squat#1", "push-up#2", "squat#2", "stretch#1"]);
  });

  it("points each rest at the exercise that comes next and never ends on a rest", () => {
    const { steps } = buildWorkout(base);
    steps.forEach((step, i) => {
      if (step.kind !== "rest") return;
      const next = steps[i + 1];
      expect(next?.kind).toBe("exercise");
      if (next?.kind === "exercise") expect(step.next.id).toBe(next.exercise.id);
    });
    expect(steps.at(-1)?.kind).toBe("exercise");
  });

  it("scales main-block reps by intensity but leaves warm-up alone", () => {
    const { steps } = buildWorkout({ ...base, intensityFactor: 1.2 });
    const push = steps.find((s) => s.kind === "exercise" && s.exercise.id === "push-up");
    const warm = steps.find((s) => s.kind === "exercise" && s.phase === "warmup");
    expect(push?.kind === "exercise" && push.reps).toBe(12);
    expect(warm?.kind === "exercise" && warm.seconds).toBe(30);
  });

  it("adds rounds for longer sessions and caps at five", () => {
    const rounds = (minutes: number) => {
      const s = buildWorkout({ ...base, minutesPerSession: minutes }).steps.find(
        (x) => x.kind === "exercise" && x.phase === "main",
      );
      return s?.kind === "exercise" ? s.totalRounds : 0;
    };
    expect(rounds(10)).toBe(1);
    expect(rounds(30)).toBe(4);
  });

  it("reports substitutions and skipped exercises", () => {
    const result = buildWorkout({ ...base, limitations: ["wrists", "knees"] });
    expect(result.skipped).toEqual(["push-up"]);
    const bridge = result.steps.find(
      (s) => s.kind === "exercise" && s.exercise.id === "glute-bridge",
    );
    expect(bridge?.kind === "exercise" && bridge.substituted).toBe(true);
  });

  it("fills the gap with a safe stand-in when one is provided", () => {
    const result = buildWorkout({
      ...base,
      limitations: ["wrists"],
      fallbacks: ["burpee", "glute-bridge"],
    });
    expect(result.skipped).toEqual([]);
    const ids = result.steps.flatMap((s) =>
      s.kind === "exercise" && s.phase === "main" ? [s.exercise.id] : [],
    );
    expect(ids).toEqual(["glute-bridge", "squat", "glute-bridge", "squat"]);
  });

  it("estimates duration from seconds, reps and rests", () => {
    const { estimatedSec } = buildWorkout(base);
    // warm-up 30 + 4 sets × 10 reps × 3 s + 4 rests × 20 + cool-down 30
    expect(estimatedSec).toBe(30 + 120 + 80 + 30);
  });

  it("averages MET over exercise time", () => {
    const { steps } = buildWorkout(base);
    expect(averageMet(steps)).toBeCloseTo((3.5 * 30 + 8 * 60 + 5 * 60 + 2.3 * 30) / 180, 5);
    expect(averageMet([])).toBe(1.5);
  });
});
