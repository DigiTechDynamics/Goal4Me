import { describe, expect, it } from "vitest";
import {
  addDays,
  assessRunnerLevel,
  averageRunMet,
  buildRunPlan,
  formatDistance,
  formatDuration,
  formatPace,
  formatPaceRange,
  nextRunIntensity,
  paceZones,
  rebaseProgress,
  riegel,
  RUN_PROGRAM_SLUGS,
  RUN_PROGRAMS,
  RunPlanError,
  weekdayOf,
  type RunSettings,
} from "../index";

// 2026-11-02 is a Monday.
const settings = (over: Partial<RunSettings> = {}): RunSettings => ({
  program: "couch-to-5k",
  daysPerWeek: 3,
  runDays: [0, 2, 5],
  longRunDay: 5,
  startDate: "2026-11-02",
  raceDate: null,
  units: "km",
  targetSeconds: null,
  ...over,
});

describe("assessRunnerLevel", () => {
  it("starts anyone who can't yet run 30 minutes on Couch to 5K", () => {
    for (const longestRun of ["none", "under_10", "10_30"] as const) {
      expect(assessRunnerLevel({ longestRun, runsPerWeek: 3 })).toEqual({
        level: "starter",
        program: "couch-to-5k",
      });
    }
  });
  it("moves experienced runners up the ladder", () => {
    expect(assessRunnerLevel({ longestRun: "30_60", runsPerWeek: 2 }).program).toBe("5k-to-10k");
    expect(assessRunnerLevel({ longestRun: "over_60", runsPerWeek: 1 }).level).toBe("racer");
    expect(assessRunnerLevel({ longestRun: "over_60", runsPerWeek: 3 }).level).toBe("pro");
  });
});

describe("buildRunPlan", () => {
  it("builds Couch to 5K as 27 runs over 9 weeks on the chosen days", () => {
    const plan = buildRunPlan(settings());
    expect(plan.sessions).toHaveLength(27);
    expect(plan.weeks).toBe(9);
    expect(plan.sessions.map((s) => s.runNumber)).toEqual(
      Array.from({ length: 27 }, (_, i) => i + 1),
    );
    for (const s of plan.sessions) expect([0, 2, 5]).toContain(weekdayOf(s.date));
    expect(plan.sessions[0]).toMatchObject({
      title: "Week 1 · Run 1",
      date: "2026-11-02",
      type: "run_walk",
    });
    // 5 min warm-up, 8 × (60 s run + 90 s walk), 5 min cool-down.
    expect(plan.sessions[0]!.totalSeconds).toBe(300 + 8 * 150 + 300);
    expect(plan.sessions.at(-1)!.type).toBe("race");
  });

  it("stretches Couch to 5K over more weeks at 2 runs a week", () => {
    const plan = buildRunPlan(settings({ daysPerWeek: 2, runDays: [1, 5] }));
    expect(plan.sessions).toHaveLength(27);
    expect(plan.weeks).toBe(14);
  });

  it("never gives beginners more than 3 runs a week; extra days are recovery walks", () => {
    const plan = buildRunPlan(settings({ daysPerWeek: 5, runDays: [0, 1, 2, 4, 5] }));
    const runs = plan.sessions.filter((s) => s.type !== "recovery_walk");
    expect(runs).toHaveLength(27);
    for (let w = 1; w <= plan.weeks; w++) {
      expect(runs.filter((s) => s.week === w).length).toBeLessThanOrEqual(3);
    }
    expect(plan.sessions.some((s) => s.type === "recovery_walk")).toBe(true);
    // The long-run day is always a running day.
    expect(runs.filter((s) => weekdayOf(s.date) === 5).length).toBe(9);
  });

  it.each(RUN_PROGRAM_SLUGS)(
    "%s: one long run (or race) and one quality session each week",
    (program) => {
      const plan = buildRunPlan(
        settings({ program, daysPerWeek: 4, runDays: [0, 1, 3, 6], longRunDay: 6 }),
      );
      const template = RUN_PROGRAMS[program];
      if (template.mode === "weekly") expect(plan.weeks).toBe(template.weeks.length);
      for (let w = 1; w <= plan.weeks; w++) {
        const week = plan.sessions.filter((s) => s.week === w);
        const dates = new Set(week.map((s) => s.date));
        expect(dates.size).toBe(week.length); // one run a day
        if (template.mode === "weekly") {
          expect(week).toHaveLength(4);
          expect(week.filter((s) => s.type === "long" || s.type === "race")).toHaveLength(1);
          // Hard days are never back to back with the long run.
          const long = week.find((s) => s.type === "long" || s.type === "race")!;
          const quality = week.find((s) => ["tempo", "intervals", "strides"].includes(s.type))!;
          expect(
            Math.abs(new Date(long.date).getTime() - new Date(quality.date).getTime()),
          ).toBeGreaterThan(86_400_000);
        }
      }
      expect(plan.sessions.at(-1)!.type).toBe("race");
      for (const s of plan.sessions) {
        expect(s.totalSeconds).toBe(s.segments.reduce((sum, seg) => sum + seg.seconds, 0));
        for (const seg of s.segments) expect(seg.seconds).toBeGreaterThan(0);
      }
    },
  );

  it("drops easy runs, never the long run or quality session, at 2 days", () => {
    const plan = buildRunPlan(settings({ program: "5k-to-10k", daysPerWeek: 2, runDays: [1, 5] }));
    expect(plan.sessions.filter((s) => s.type === "easy")).toHaveLength(0);
    expect(plan.sessions).toHaveLength(16);
  });

  it("calls the final run a goal run when there is no race", () => {
    const plan = buildRunPlan(settings({ program: "5k-to-10k", runDays: [1, 3, 5] }));
    expect(plan.sessions.at(-1)).toMatchObject({ type: "race", title: "Goal run: your 10K" });
  });

  it("fits the plan so the race lands on race day", () => {
    const raceDate = "2027-02-28"; // a Sunday, 17 weeks out
    const plan = buildRunPlan(settings({ program: "5k-to-10k", raceDate, runDays: [1, 3, 5] }));
    const race = plan.sessions.at(-1)!;
    expect(race).toMatchObject({ type: "race", date: raceDate, title: "Race day: your 10K" });
    expect(plan.sessions.every((s) => s.date <= raceDate && s.date >= "2026-11-02")).toBe(true);
    // Far-off race: easy base weeks first, capped at 6.
    expect(plan.weeks).toBe(8 + 6);
  });

  it("trims early weeks for a close race, and refuses one that's too close", () => {
    const close = buildRunPlan(
      settings({ program: "10k-to-half", raceDate: addDays("2026-11-02", 7 * 10 - 1) }),
    );
    expect(close.weeks).toBe(10);
    expect(() =>
      buildRunPlan(settings({ program: "10k-to-half", raceDate: addDays("2026-11-02", 7 * 6) })),
    ).toThrow(RunPlanError);
    expect(() => buildRunPlan(settings({ raceDate: addDays("2026-11-02", 7 * 5) }))).toThrow(
      /needs about 9 weeks/,
    );
  });

  it("puts the Couch to 5K graduation run on race day", () => {
    const raceDate = addDays("2026-11-02", 7 * 10);
    const plan = buildRunPlan(settings({ raceDate }));
    expect(plan.sessions.at(-1)).toMatchObject({ type: "race", date: raceDate });
  });

  it("validates run days", () => {
    expect(() => buildRunPlan(settings({ runDays: [0, 2] }))).toThrow(RunPlanError);
    expect(() => buildRunPlan(settings({ longRunDay: 6 }))).toThrow(/long-run day/);
    expect(() => buildRunPlan(settings({ runDays: [0, 0, 5] }))).toThrow(RunPlanError);
  });

  it("scales run time with intensity but never warm-ups or rep lengths", () => {
    const base = buildRunPlan(settings({ program: "10k-to-half" }));
    const harder = buildRunPlan(settings({ program: "10k-to-half" }), 1.15);
    const long = (p: typeof base) =>
      p.sessions.find((s) => s.type === "long")!.segments[0]!.seconds;
    expect(long(harder)).toBeGreaterThan(long(base));
    const warm = (p: typeof base) =>
      p.sessions.find((s) => s.type === "tempo")!.segments[0]!.seconds;
    expect(warm(harder)).toBe(warm(base));
    // Out-of-range intensity is clamped.
    expect(long(buildRunPlan(settings({ program: "10k-to-half" }), 5))).toBe(long(harder));
  });

  it("uses the goal time for the race block when set", () => {
    const plan = buildRunPlan(settings({ program: "5k-speed", targetSeconds: 1500 }));
    const race = plan.sessions.at(-1)!.segments.find((s) => s.kind === "race")!;
    expect(race).toEqual({ kind: "race", seconds: 1500, open: true });
  });
});

describe("rebaseProgress", () => {
  it("keeps the runner in the same week when they change their days", () => {
    const before = buildRunPlan(settings({ program: "5k-to-10k" }));
    const after = buildRunPlan(
      settings({ program: "5k-to-10k", daysPerWeek: 4, runDays: [0, 2, 4, 5] }),
    );
    // 7 runs done = into week 3 of a 3-a-week plan.
    const index = rebaseProgress(before, 7, after);
    expect(after.sessions[index]!.week).toBe(3);
    expect(after.sessions[index - 1]!.week).toBe(2);
    expect(rebaseProgress(before, before.sessions.length, after)).toBe(after.sessions.length);
  });
});

describe("nextRunIntensity", () => {
  it("nudges by 5% and clamps", () => {
    expect(nextRunIntensity(1, "easy")).toBe(1.05);
    expect(nextRunIntensity(1, "hard")).toBe(0.95);
    expect(nextRunIntensity(1, "just_right")).toBe(1);
    expect(nextRunIntensity(1.15, "easy")).toBe(1.15);
    expect(nextRunIntensity(0.85, "hard")).toBe(0.85);
  });
});

describe("pace", () => {
  it("predicts times with Riegel's formula", () => {
    expect(riegel(1500, 5000, 5000)).toBe(1500);
    expect(Math.round(riegel(1500, 5000, 10_000))).toBe(3127);
  });
  it("derives zones from a goal time", () => {
    const z = paceZones(5000, 1500); // 25:00 5K = 5:00 /km
    expect(z.race).toEqual([300, 300]);
    expect(z.easy[0]).toBeCloseTo(375);
    expect(z.tempo[0]).toBeLessThan(z.easy[0]);
    expect(z.interval[1]).toBeCloseTo(300);
  });
  it("formats paces, durations and distances", () => {
    expect(formatPace(300, "km")).toBe("5:00 /km");
    expect(formatPace(300, "mi")).toBe("8:03 /mi");
    expect(formatPaceRange([300, 330], "km")).toBe("5:00–5:30 /km");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(1800)).toBe("30 min");
    expect(formatDuration(5400)).toBe("1 h 30 min");
    expect(formatDistance(5000, "km")).toBe("5.0 km");
    expect(formatDistance(5000, "mi")).toBe("3.1 mi");
  });
});

describe("averageRunMet", () => {
  it("weights each segment by its time", () => {
    expect(
      averageRunMet([
        { kind: "walk", seconds: 60 },
        { kind: "fast", seconds: 60 },
      ]),
    ).toBe(7.25);
    expect(averageRunMet([])).toBe(8);
  });
});
