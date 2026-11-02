import type { WorkoutStep } from "@goal4me/core";

/**
 * The workout player as a pure state machine. The screen dispatches a
 * `tick` every second plus user actions; all timing rules live here, so
 * they're unit-tested without a device.
 *
 *   ready (3 s countdown) → step 0 → step 1 → … → finished
 *   timed steps (rest, timed exercises) advance automatically at 0;
 *   rep-based exercises wait for the user to tap "Done".
 */

export const GET_READY_SECONDS = 3;
export const REST_EXTENSION_SECONDS = 15;

export type PlayerStatus = "ready" | "running" | "paused" | "finished";

export interface PlayerState {
  status: PlayerStatus;
  index: number;
  /** Seconds left on the current countdown, or null for rep-based steps. */
  remaining: number | null;
  /** Seconds actually spent working out (excludes pauses). */
  elapsed: number;
  /** Status to return to when resuming from a pause. */
  resumeTo: Exclude<PlayerStatus, "paused" | "finished">;
}

export type PlayerAction =
  | { type: "tick" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "extendRest" }
  | { type: "finish" };

const countdownFor = (step: WorkoutStep | undefined): number | null =>
  !step ? null : step.kind === "rest" ? step.seconds : step.seconds;

export function initialPlayerState(): PlayerState {
  return { status: "ready", index: 0, remaining: GET_READY_SECONDS, elapsed: 0, resumeTo: "ready" };
}

function goTo(state: PlayerState, steps: readonly WorkoutStep[], index: number): PlayerState {
  if (index >= steps.length) return { ...state, status: "finished", remaining: null };
  const clamped = Math.max(0, index);
  return { ...state, status: "running", index: clamped, remaining: countdownFor(steps[clamped]) };
}

export function playerReducer(
  state: PlayerState,
  action: PlayerAction,
  steps: readonly WorkoutStep[],
): PlayerState {
  if (state.status === "finished") return state;

  switch (action.type) {
    case "tick": {
      if (state.status === "paused") return state;
      const elapsed = state.status === "running" ? state.elapsed + 1 : state.elapsed;
      if (state.remaining === null) return { ...state, elapsed }; // waiting for "Done"
      const remaining = state.remaining - 1;
      if (remaining > 0) return { ...state, elapsed, remaining };
      // Countdown hit zero: the get-ready screen starts step 0, a step moves on.
      return state.status === "ready"
        ? goTo({ ...state, elapsed }, steps, 0)
        : goTo({ ...state, elapsed }, steps, state.index + 1);
    }
    case "next":
      return state.status === "ready" ? goTo(state, steps, 0) : goTo(state, steps, state.index + 1);
    case "previous":
      return state.status === "ready" ? state : goTo(state, steps, state.index - 1);
    case "pause":
      return state.status === "paused"
        ? state
        : { ...state, status: "paused", resumeTo: state.status };
    case "resume":
      return state.status === "paused" ? { ...state, status: state.resumeTo } : state;
    case "extendRest": {
      const step = steps[state.index];
      if (state.status !== "running" || step?.kind !== "rest" || state.remaining === null)
        return state;
      return { ...state, remaining: state.remaining + REST_EXTENSION_SECONDS };
    }
    case "finish":
      return { ...state, status: "finished", remaining: null };
  }
}

/** Share of the workout completed, 0–1, for the progress bar. */
export function progressOf(state: PlayerState, steps: readonly WorkoutStep[]): number {
  if (state.status === "finished") return 1;
  if (state.status === "ready" || steps.length === 0) return 0;
  return state.index / steps.length;
}

/** Number of exercise steps the user reached, for "you did X of Y moves". */
export function exercisesReached(state: PlayerState, steps: readonly WorkoutStep[]): number {
  const upTo =
    state.status === "finished" && state.index >= steps.length - 1 ? steps.length : state.index + 1;
  return steps.slice(0, upTo).filter((s) => s.kind === "exercise").length;
}
