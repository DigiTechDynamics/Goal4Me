import type { RunSegment } from "@goal4me/core";
import { describe, expect, it } from "vitest";
import {
  activeMs,
  initialRunPlayerState,
  positionAt,
  runPlayerReducer,
  type RunPlayerAction,
  type RunPlayerState,
} from "../player/machine";

const SEGMENTS: RunSegment[] = [
  { kind: "warmup", seconds: 300 },
  { kind: "run", seconds: 60 },
  { kind: "walk", seconds: 90 },
  { kind: "cooldown", seconds: 300 },
];
const RACE: RunSegment[] = [
  { kind: "warmup", seconds: 300 },
  { kind: "race", seconds: 1800, open: true },
  { kind: "cooldown", seconds: 300 },
];

const T0 = 1_700_000_000_000;
const s = (seconds: number) => T0 + seconds * 1000;

function run(actions: RunPlayerAction[], segments = SEGMENTS): RunPlayerState {
  return actions.reduce(
    (state, a) => runPlayerReducer(state, a, segments),
    initialRunPlayerState(),
  );
}

describe("run player", () => {
  it("walks through segments by wall-clock time", () => {
    const state = run([{ type: "start", now: T0 }]);
    expect(positionAt(state, SEGMENTS, s(10))).toMatchObject({
      index: 0,
      remaining: 290,
      elapsed: 10,
    });
    expect(positionAt(state, SEGMENTS, s(300))).toMatchObject({ index: 1, remaining: 60 });
    expect(positionAt(state, SEGMENTS, s(400))).toMatchObject({
      index: 2,
      inSegment: 40,
      remaining: 50,
    });
  });

  it("catches up correctly after the app was in the background", () => {
    const state = run([{ type: "start", now: T0 }]);
    // 7 minutes in a pocket with no ticks at all.
    expect(positionAt(state, SEGMENTS, s(420))).toMatchObject({ index: 2, remaining: 30 });
    expect(positionAt(state, SEGMENTS, s(800))).toMatchObject({ complete: true, index: 4 });
  });

  it("stops the clock while paused", () => {
    const state = run([
      { type: "start", now: T0 },
      { type: "pause", now: s(100) },
    ]);
    expect(positionAt(state, SEGMENTS, s(5000))).toMatchObject({ index: 0, elapsed: 100 });
    const resumed = runPlayerReducer(state, { type: "resume", now: s(5000) }, SEGMENTS);
    expect(positionAt(resumed, SEGMENTS, s(5050)).elapsed).toBe(150);
  });

  it("skips to the next segment without counting skipped time as running", () => {
    const state = run([
      { type: "start", now: T0 },
      { type: "skip", now: s(20) },
    ]);
    expect(positionAt(state, SEGMENTS, s(20))).toMatchObject({
      index: 1,
      remaining: 60,
      elapsed: 20,
    });
    expect(positionAt(state, SEGMENTS, s(85))).toMatchObject({ index: 2 });
  });

  it("holds an open race segment until the runner finishes it", () => {
    const state = run([{ type: "start", now: T0 }], RACE);
    expect(positionAt(state, RACE, s(300 + 3600))).toMatchObject({
      index: 1,
      remaining: null,
      inSegment: 3600,
    });
    const finished = runPlayerReducer(state, { type: "skip", now: s(300 + 3600) }, RACE);
    expect(positionAt(finished, RACE, s(300 + 3600 + 10))).toMatchObject({
      index: 2,
      remaining: 290,
    });
    expect(positionAt(finished, RACE, s(300 + 3600 + 10)).elapsed).toBe(3910);
  });

  it("records active time when finished and ignores later actions", () => {
    const state = run([
      { type: "start", now: T0 },
      { type: "pause", now: s(60) },
      { type: "resume", now: s(120) },
      { type: "finish", now: s(180) },
      { type: "resume", now: s(200) },
    ]);
    expect(state.status).toBe("finished");
    expect(activeMs(state, s(9999))).toBe(120_000);
    expect(state.startedAt).toBe(T0);
  });

  it("doesn't count time after the plan ended", () => {
    // 750 s of segments; the runner only reopens the app 20 minutes later.
    const state = run([
      { type: "start", now: T0 },
      { type: "finish", now: s(750 + 1200) },
    ]);
    expect(activeMs(state, s(9999))).toBe(750_000);
    const skipped = run([
      { type: "start", now: T0 },
      { type: "skip", now: s(10) }, // skip most of the warm-up
      { type: "finish", now: s(5000) },
    ]);
    expect(activeMs(skipped, s(9999))).toBe((10 + 60 + 90 + 300) * 1000);
  });

  it("ignores actions that don't apply", () => {
    const ready = initialRunPlayerState();
    expect(runPlayerReducer(ready, { type: "pause", now: T0 }, SEGMENTS)).toBe(ready);
    expect(runPlayerReducer(ready, { type: "skip", now: T0 }, SEGMENTS)).toBe(ready);
    expect(runPlayerReducer(ready, { type: "finish", now: T0 }, SEGMENTS)).toBe(ready);
  });
});
