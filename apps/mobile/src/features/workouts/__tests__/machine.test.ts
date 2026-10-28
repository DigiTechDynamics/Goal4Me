import type { ExerciseInfo, WorkoutStep } from "@goal4me/core";
import { describe, expect, it } from "vitest";
import {
  GET_READY_SECONDS,
  initialPlayerState,
  playerReducer,
  progressOf,
  REST_EXTENSION_SECONDS,
  type PlayerAction,
  type PlayerState,
} from "../player/machine";

const exercise: ExerciseInfo = {
  id: "e1",
  name: "Squat",
  difficulty: 2,
  met: 5,
  contraindications: [],
  easierId: null,
  videoPath: null,
  formTips: [],
};

const steps: WorkoutStep[] = [
  {
    kind: "exercise",
    exercise,
    phase: "warmup",
    round: 1,
    totalRounds: 1,
    reps: null,
    seconds: 2,
    substituted: false,
  },
  { kind: "rest", seconds: 2, next: exercise },
  {
    kind: "exercise",
    exercise,
    phase: "main",
    round: 1,
    totalRounds: 1,
    reps: 10,
    seconds: null,
    substituted: false,
  },
];

const run = (state: PlayerState, ...actions: PlayerAction["type"][]) =>
  actions.reduce((s, type) => playerReducer(s, { type } as PlayerAction, steps), state);
const ticks = (n: number): "tick"[] => Array.from({ length: n }, () => "tick" as const);

describe("workout player", () => {
  it("counts down before the first exercise", () => {
    const state = run(initialPlayerState(), ...ticks(GET_READY_SECONDS));
    expect(state).toMatchObject({ status: "running", index: 0, remaining: 2 });
  });

  it("auto-advances timed steps and waits on rep-based ones", () => {
    const state = run(initialPlayerState(), ...ticks(GET_READY_SECONDS + 4));
    expect(state).toMatchObject({ status: "running", index: 2, remaining: null });
    const waited = run(state, ...ticks(10));
    expect(waited.index).toBe(2);
    expect(waited.elapsed).toBe(state.elapsed + 10);
  });

  it("finishes after the last step is done", () => {
    const state = run(initialPlayerState(), "next", "next", "next", "next");
    expect(state.status).toBe("finished");
    expect(progressOf(state, steps)).toBe(1);
  });

  it("ignores ticks while paused and resumes where it was", () => {
    const running = run(initialPlayerState(), "next");
    const paused = run(running, "pause", ...ticks(5));
    expect(paused).toMatchObject({ status: "paused", remaining: 2, elapsed: running.elapsed });
    expect(run(paused, "resume").status).toBe("running");
  });

  it("can pause the get-ready countdown", () => {
    expect(run(initialPlayerState(), "pause", "resume").status).toBe("ready");
  });

  it("extends rests only", () => {
    const onExercise = run(initialPlayerState(), "next");
    expect(run(onExercise, "extendRest")).toEqual(onExercise);
    const onRest = run(onExercise, "next");
    expect(run(onRest, "extendRest").remaining).toBe(2 + REST_EXTENSION_SECONDS);
  });

  it("goes back a step but not before the first", () => {
    const state = run(initialPlayerState(), "next", "next", "previous", "previous", "previous");
    expect(state.index).toBe(0);
  });

  it("does nothing once finished", () => {
    const done = run(initialPlayerState(), "finish");
    expect(run(done, "next", "tick", "resume")).toEqual(done);
  });
});
