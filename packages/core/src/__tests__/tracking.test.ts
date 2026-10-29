import { describe, expect, it } from "vitest";
import {
  badgeStates,
  goalProgress,
  liveStreak,
  measurementChanges,
  movingAverage,
  sinceDate,
  weekStart,
  type StoredStreak,
} from "../index";

const streak = (overrides: Partial<StoredStreak>): StoredStreak => ({
  currentDays: 5,
  bestDays: 9,
  lastActiveOn: "2026-10-28",
  freezesLeft: 1,
  freezeWeek: "2026-10-26",
  ...overrides,
});

describe("weekStart", () => {
  it("returns the Monday of the week, like Postgres date_trunc", () => {
    expect(weekStart("2026-10-28")).toBe("2026-10-26"); // Wednesday
    expect(weekStart("2026-10-26")).toBe("2026-10-26"); // Monday
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // Sunday
  });
});

describe("liveStreak", () => {
  it("has no streak before the first workout", () => {
    expect(liveStreak(null, "2026-10-28")).toEqual({ days: 0, bestDays: 0, status: "none" });
  });

  it("is done for today after training today", () => {
    expect(liveStreak(streak({}), "2026-10-28").status).toBe("done_today");
  });

  it("is at risk the day after training", () => {
    expect(liveStreak(streak({}), "2026-10-29")).toEqual({
      days: 5,
      bestDays: 9,
      status: "at_risk",
    });
  });

  it("needs the freeze after one missed day, if a freeze is left", () => {
    expect(liveStreak(streak({}), "2026-10-30").status).toBe("freeze_needed");
    expect(liveStreak(streak({ freezesLeft: 0 }), "2026-10-30")).toMatchObject({
      days: 0,
      status: "none",
    });
  });

  it("counts the freeze as refilled in a new week", () => {
    const usedLastWeek = streak({ lastActiveOn: "2026-10-31", freezesLeft: 0 });
    expect(liveStreak(usedLastWeek, "2026-11-02").status).toBe("freeze_needed");
  });

  it("ends after two missed days but keeps the best", () => {
    expect(liveStreak(streak({}), "2026-10-31")).toEqual({ days: 0, bestDays: 9, status: "none" });
  });
});

describe("badgeStates", () => {
  it("marks earned badges in catalogue order and ignores unknown ids", () => {
    const states = badgeStates([
      { badge: "streak_7", earnedAt: "2026-10-20T08:00:00Z" },
      { badge: "from_the_future", earnedAt: "2026-10-21T08:00:00Z" },
    ]);
    expect(states.map((b) => b.id)).toEqual(["first_workout", "streak_7", "streak_30"]);
    expect(states.map((b) => b.earnedAt !== null)).toEqual([false, true, false]);
  });
});

describe("goalProgress", () => {
  it("works for losing and gaining, clamped to 0–1", () => {
    expect(goalProgress(80, 75, 70)).toBe(0.5);
    expect(goalProgress(60, 63, 66)).toBe(0.5);
    expect(goalProgress(80, 82, 70)).toBe(0);
    expect(goalProgress(80, 68, 70)).toBe(1);
    expect(goalProgress(70, 70, 70)).toBe(1);
  });
});

describe("movingAverage", () => {
  it("averages the trailing window", () => {
    const entries = [80, 81, 79, 78].map((weightKg, i) => ({
      measuredOn: `2026-10-0${i + 1}`,
      weightKg,
    }));
    expect(movingAverage(entries, 2).map((e) => e.weightKg)).toEqual([80, 80.5, 80, 78.5]);
    expect(() => movingAverage(entries, 0)).toThrow(RangeError);
  });
});

describe("measurementChanges", () => {
  it("reports latest value and change for measurements that were logged", () => {
    const changes = measurementChanges([
      { measuredOn: "2026-10-01", waistCm: 90, hipsCm: null },
      { measuredOn: "2026-10-08", waistCm: 88.5, chestCm: 100 },
      { measuredOn: "2026-10-15" },
    ]);
    expect(changes).toEqual([
      { key: "waistCm", latest: 88.5, change: -1.5 },
      { key: "chestCm", latest: 100, change: null },
    ]);
  });
});

describe("sinceDate", () => {
  it("filters inclusively and returns everything for null", () => {
    const entries = [{ measuredOn: "2026-10-01" }, { measuredOn: "2026-10-10" }];
    expect(sinceDate(entries, "2026-10-10")).toHaveLength(1);
    expect(sinceDate(entries, null)).toHaveLength(2);
  });
});
