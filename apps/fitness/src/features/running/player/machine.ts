import type { RunSegment } from "@goal4me/core";

/**
 * The guided-run player as a pure state machine driven by wall-clock time.
 *
 * Unlike the workout player (which counts 1-second ticks), runs last up to a
 * few hours and the phone spends them in a pocket: timers can be paused by
 * the OS. So the state stores *when* the run was active, and every reading
 * is computed from `now`. Returning to the app after 20 minutes in the
 * background shows exactly where the runner should be.
 *
 *   ready → running ⇄ paused → finished
 *   "skip" jumps to the next segment; open segments (a race) wait for "skip".
 */

export type RunPlayerStatus = "ready" | "running" | "paused" | "finished";

export interface RunPlayerState {
  status: RunPlayerStatus;
  /** Wall-clock start of the run (ms), for the log. */
  startedAt: number | null;
  /** Active milliseconds banked before the current running stretch. */
  bankedMs: number;
  /** When the current running stretch began (ms); null unless running. */
  since: number | null;
  /** Added to active time to find the position in the plan (skips move it forward). */
  offsetMs: number;
  /** Highest index of an open segment the runner has finished. */
  passedOpen: number;
}

export type RunPlayerAction =
  | { type: "start"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "skip"; now: number }
  | { type: "finish"; now: number };

export const initialRunPlayerState = (): RunPlayerState => ({
  status: "ready",
  startedAt: null,
  bankedMs: 0,
  since: null,
  offsetMs: 0,
  passedOpen: -1,
});

/** Milliseconds the runner has actually been running (excludes pauses). */
export const activeMs = (state: RunPlayerState, now: number): number =>
  state.bankedMs + (state.since === null ? 0 : Math.max(0, now - state.since));

export interface RunPosition {
  /** Current segment, or segments.length once the plan is complete. */
  index: number;
  /** Seconds into the current segment. */
  inSegment: number;
  /** Seconds left in the current segment (null for an open segment). */
  remaining: number | null;
  /** Seconds of active running so far. */
  elapsed: number;
  /** True once every segment is done. */
  complete: boolean;
}

/** Start time (seconds) of each segment, with open segments at their estimate. */
const starts = (segments: readonly RunSegment[]) => {
  const out: number[] = [];
  let t = 0;
  for (const s of segments) {
    out.push(t);
    t += s.seconds;
  }
  return { out, total: t };
};

export function positionAt(
  state: RunPlayerState,
  segments: readonly RunSegment[],
  now: number,
): RunPosition {
  const elapsedMs = activeMs(state, now);
  const elapsed = Math.floor(elapsedMs / 1000);
  const position = (elapsedMs + state.offsetMs) / 1000;
  const { out } = starts(segments);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const start = out[i] ?? 0;
    if (!seg) break;
    const inSegment = Math.max(0, position - start);
    if (seg.open && i > state.passedOpen) {
      // An open segment holds the runner until they tap Finish, however long it takes.
      return {
        index: i,
        inSegment: Math.floor(inSegment),
        remaining: null,
        elapsed,
        complete: false,
      };
    }
    if (position < start + seg.seconds) {
      return {
        index: i,
        inSegment: Math.floor(inSegment),
        remaining: Math.ceil(start + seg.seconds - position),
        elapsed,
        complete: false,
      };
    }
  }
  return { index: segments.length, inSegment: 0, remaining: 0, elapsed, complete: true };
}

export function runPlayerReducer(
  state: RunPlayerState,
  action: RunPlayerAction,
  segments: readonly RunSegment[],
): RunPlayerState {
  if (state.status === "finished") return state;
  const { now } = action;
  switch (action.type) {
    case "start":
      return state.status === "ready"
        ? { ...state, status: "running", startedAt: now, since: now }
        : state;
    case "pause":
      return state.status === "running"
        ? { ...state, status: "paused", bankedMs: activeMs(state, now), since: null }
        : state;
    case "resume":
      return state.status === "paused" ? { ...state, status: "running", since: now } : state;
    case "skip": {
      if (state.status !== "running" && state.status !== "paused") return state;
      const { index } = positionAt(state, segments, now);
      const seg = segments[index];
      if (!seg) return state;
      // Move the position to the start of the next segment.
      const { out, total } = starts(segments);
      const nextStart = out[index + 1] ?? total;
      return {
        ...state,
        offsetMs: nextStart * 1000 - activeMs(state, now),
        passedOpen: seg.open ? index : state.passedOpen,
      };
    }
    case "finish": {
      if (state.status === "ready") return state;
      // Time spent after the last segment ended (e.g. the phone sat in a
      // pocket through the cool-down's end) isn't running, so cap it there.
      const endMs = starts(segments).total * 1000 - state.offsetMs;
      return {
        ...state,
        status: "finished",
        bankedMs: Math.min(activeMs(state, now), Math.max(0, endMs)),
        since: null,
      };
    }
  }
}
