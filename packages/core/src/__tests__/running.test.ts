import { describe, expect, it } from "vitest";
import {
  assessRunnerLevel,
  currentRunWeek,
  describeSeconds,
  formatClock,
  formatPace,
  generateRunPlan,
  isRunPlanComplete,
  nextRunnerLevel,
  paceSecPerKm,
  predictRaceSeconds,
  RUN_GOALS,
  RUNNER_LEVELS,
  runPlanWarnings,
  suggestLevelChange,
} from "../index";

describe("assessRunnerLevel", () => {
  it("places runners from continuous minutes and weekly distance", () => {
    expect(assessRunnerLevel({ continuousMinutes: 0, weeklyKm: 0 })).toBe("novice");
    expect(assessRunnerLevel({ continuousMinutes: 19, weeklyKm: 40 })).toBe("novice");
    expect(assessRunnerLevel({ continuousMinutes: 30, weeklyKm: 10 })).toBe("beginner");
    expect(assessRunnerLevel({ continuousMinutes: 45, weeklyKm: 20 })).toBe("intermediate");
    expect(assessRunnerLevel({ continuousMinutes: 90, weeklyKm: 40 })).toBe("advanced");
    expect(assessRunnerLevel({ continuousMinutes: 120, weeklyKm: 70 })).toBe("pro");
  });
});

describe("generateRunPlan", () => {
  it("produces the requested weeks and days for every level and goal", () => {
    for (const level of RUNNER_LEVELS) {
      for (const goal of RUN_GOALS) {
        const plan = generateRunPlan({ level, goal, daysPerWeek: 4, weeks: 12 });
        expect(plan).toHaveLength(12);
        for (const week of plan) {
          expect(week.sessions).toHaveLength(4);
          for (const s of week.sessions) expect(s.minutes).toBeGreaterThan(0);
        }
        expect(plan.at(-1)!.sessions.at(-1)!.type).toBe("race");
      }
    }
  });

  it("starts novices on walk-run and ends the ladder with continuous running", () => {
    const plan = generateRunPlan({ level: "novice", goal: "5k", daysPerWeek: 3, weeks: 10 });
    expect(plan[0]!.sessions.every((s) => s.type === "walk_run")).toBe(true);
    expect(plan[0]!.sessions[0]!.intervals).toEqual({ runSec: 60, walkSec: 90, repeats: 8 });
    const ladder = plan.flatMap((w) => w.sessions).filter((s) => s.type === "walk_run");
    expect(ladder.at(-1)!.intervals!.walkSec).toBe(0);
  });

  it("keeps novices and beginners off hard sessions early on", () => {
    for (const level of ["novice", "beginner"] as const) {
      const plan = generateRunPlan({ level, goal: "10k", daysPerWeek: 3, weeks: 12 });
      const first = plan[0]!.sessions.map((s) => s.type);
      expect(first.some((t) => t === "tempo" || t === "intervals" || t === "hills")).toBe(false);
    }
  });

  it("never grows weekly time by more than 10% outside cutback recovery", () => {
    const plan = generateRunPlan({
      level: "intermediate",
      goal: "half",
      daysPerWeek: 4,
      weeks: 14,
    });
    for (let i = 1; i < plan.length; i++) {
      const prev = plan[i - 1]!;
      const week = plan[i]!;
      if (prev.isCutback || week.isTaper || i === plan.length - 1) continue;
      // Rounding sessions to 5 minutes adds a little slack.
      expect(week.totalMinutes).toBeLessThanOrEqual(prev.totalMinutes * 1.1 + 10);
    }
  });

  it("includes lighter cutback weeks and a taper", () => {
    const plan = generateRunPlan({
      level: "advanced",
      goal: "marathon",
      daysPerWeek: 5,
      weeks: 16,
    });
    expect(plan.some((w) => w.isCutback)).toBe(true);
    expect(plan.filter((w) => w.isTaper)).toHaveLength(2);
    const peak = Math.max(...plan.map((w) => w.totalMinutes));
    expect(plan.at(-2)!.totalMinutes).toBeLessThan(peak);
  });

  it("never puts two hard sessions back to back", () => {
    const plan = generateRunPlan({ level: "pro", goal: "10k", daysPerWeek: 5, weeks: 8 });
    const hard = new Set(["tempo", "intervals", "hills"]);
    for (const week of plan) {
      for (let i = 1; i < week.sessions.length; i++) {
        expect(hard.has(week.sessions[i - 1]!.type) && hard.has(week.sessions[i]!.type)).toBe(
          false,
        );
      }
    }
  });

  it("clamps out-of-range settings", () => {
    const plan = generateRunPlan({ level: "beginner", goal: "5k", daysPerWeek: 9, weeks: 1 });
    expect(plan).toHaveLength(4);
    expect(plan[0]!.sessions).toHaveLength(6);
  });

  it("is deterministic", () => {
    const settings = { level: "intermediate", goal: "10k", daysPerWeek: 4, weeks: 8 } as const;
    expect(generateRunPlan(settings)).toEqual(generateRunPlan(settings));
  });
});

describe("runPlanWarnings", () => {
  it("warns about risky plans and stays quiet for sensible ones", () => {
    expect(
      runPlanWarnings({ level: "novice", goal: "marathon", daysPerWeek: 3, weeks: 20 }),
    ).toHaveLength(1);
    expect(
      runPlanWarnings({ level: "beginner", goal: "half", daysPerWeek: 3, weeks: 8 })[0],
    ).toMatch(/at least 14 weeks/);
    expect(runPlanWarnings({ level: "novice", goal: "5k", daysPerWeek: 6, weeks: 9 })[0]).toMatch(
      /4 running days/,
    );
    expect(
      runPlanWarnings({ level: "intermediate", goal: "10k", daysPerWeek: 4, weeks: 8 }),
    ).toEqual([]);
  });
});

describe("progress", () => {
  const plan = generateRunPlan({ level: "beginner", goal: "5k", daysPerWeek: 2, weeks: 4 });

  it("finds the first week with an unlogged session", () => {
    expect(currentRunWeek(plan, [])).toBe(1);
    const week1 = [
      { week: 1, sessionIndex: 0 },
      { week: 1, sessionIndex: 1 },
    ];
    expect(currentRunWeek(plan, week1)).toBe(2);
    // A run logged later doesn't skip a missed week.
    expect(currentRunWeek(plan, [...week1, { week: 3, sessionIndex: 0 }])).toBe(2);
  });

  it("knows when the plan is complete", () => {
    const all = plan.flatMap((w) => w.sessions.map((_, i) => ({ week: w.week, sessionIndex: i })));
    expect(isRunPlanComplete(plan, all.slice(1))).toBe(false);
    expect(isRunPlanComplete(plan, all)).toBe(true);
    expect(currentRunWeek(plan, all)).toBe(4);
  });

  it("suggests a level change from effort ratings", () => {
    expect(suggestLevelChange(["too_easy", "too_easy", "too_easy"])).toBe("up");
    expect(suggestLevelChange(["too_easy", "just_right", "too_easy"])).toBeNull();
    expect(suggestLevelChange(["just_right", "too_hard", "too_hard"])).toBe("down");
    expect(suggestLevelChange([])).toBeNull();
    expect(nextRunnerLevel("pro", "up")).toBe("pro");
    expect(nextRunnerLevel("beginner", "down")).toBe("novice");
  });
});

describe("pace", () => {
  it("formats pace and times", () => {
    expect(paceSecPerKm(5, 1650)).toBe(330);
    expect(paceSecPerKm(0, 100)).toBeNull();
    expect(formatPace(330)).toBe("5:30 /km");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(330)).toBe("5:30");
    expect(describeSeconds(90)).toBe("1 min 30 s");
    expect(describeSeconds(120)).toBe("2 min");
    expect(describeSeconds(45)).toBe("45 s");
  });

  it("predicts race times with Riegel's formula", () => {
    // A 25-minute 5K predicts roughly 52 minutes for 10K.
    const tenK = predictRaceSeconds(5, 25 * 60, 10);
    expect(tenK / 60).toBeCloseTo(52.1, 0);
  });
});
