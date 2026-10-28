import { describe, expect, it } from "vitest";
import { freeDayLimit, isDayLocked } from "../index";

// "ARBRARB": workouts on days 1, 3, 5, 7.
const days = [..."ARBRARB"].map((c, i) => ({ dayNumber: i + 1, isRestDay: c === "R" }));

describe("free tier", () => {
  it("unlocks the first three workout days, skipping rest days", () => {
    expect(freeDayLimit(days)).toBe(5);
    expect(isDayLocked(days[4]!, days, false)).toBe(false);
    expect(isDayLocked(days[6]!, days, false)).toBe(true);
    expect(isDayLocked(days[5]!, days, false)).toBe(false); // rest days are never locked
  });

  it("unlocks everything for premium users", () => {
    expect(isDayLocked(days[6]!, days, true)).toBe(false);
  });

  it("handles programmes with fewer than three workouts", () => {
    expect(freeDayLimit(days.slice(0, 2))).toBe(1);
    expect(freeDayLimit([])).toBe(0);
  });
});
