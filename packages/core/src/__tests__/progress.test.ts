import { describe, expect, it } from "vitest";
import {
  addDays,
  cmToFeetInches,
  daysBetween,
  estimateKcal,
  feetInchesToCm,
  lbToKg,
  monthsUntil,
  MAX_PROJECTION_WEEKS,
  nextIntensityFactor,
  parseIsoDate,
  projectGoal,
  scaleTarget,
} from "../index";

describe("units", () => {
  it("converts imperial to metric and back", () => {
    expect(lbToKg(220.462)).toBeCloseTo(100, 2);
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 5);
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
  });
});

describe("dates", () => {
  it("adds days across month ends and leap years in UTC", () => {
    expect(addDays("2026-01-01", 31)).toBe("2026-02-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-01-01", "2026-12-31")).toBe(364);
  });

  it("rejects impossible dates", () => {
    expect(() => parseIsoDate("2026-02-30")).toThrow(TypeError);
    expect(() => parseIsoDate("02/03/2026")).toThrow(TypeError);
  });

  it("counts partial months as whole months", () => {
    expect(monthsUntil("2026-01-15", "2026-03-15")).toBe(2);
    expect(monthsUntil("2026-01-15", "2026-03-20")).toBe(3);
    expect(monthsUntil("2026-01-15", "2026-01-20")).toBe(1);
    expect(monthsUntil("2026-01-15", "2026-01-10")).toBe(0);
  });
});

describe("projectGoal", () => {
  it("projects weight loss at 0.65% a week", () => {
    const p = projectGoal({ currentKg: 80, targetKg: 72, startDate: "2026-01-01" });
    expect(p.weeks).toBe(17);
    expect(p.goalDate).toBe(addDays("2026-01-01", 17 * 7));
    expect(p.points).toHaveLength(18);
    expect(p.points.at(-1)?.weightKg).toBe(72);
  });

  it("projects weight gain at 0.25% a week", () => {
    expect(projectGoal({ currentKg: 60, targetKg: 63, startDate: "2026-01-01" }).weeks).toBe(20);
  });

  it("returns zero weeks when already at target", () => {
    expect(projectGoal({ currentKg: 70, targetKg: 70, startDate: "2026-01-01" }).weeks).toBe(0);
  });

  it("caps very long projections", () => {
    const p = projectGoal({ currentKg: 150, targetKg: 60, startDate: "2026-01-01" });
    expect(p.weeks).toBeNull();
    expect(p.goalDate).toBeNull();
    expect(p.points).toHaveLength(MAX_PROJECTION_WEEKS + 1);
  });
});

describe("workout", () => {
  it("estimates kcal from MET, weight and duration", () => {
    expect(estimateKcal({ met: 8, weightKg: 70, durationSec: 1800 })).toBe(280);
    expect(() => estimateKcal({ met: 0, weightKg: 70, durationSec: 60 })).toThrow(RangeError);
  });

  it("eases off after a too-hard rating", () => {
    expect(nextIntensityFactor(1, ["too_easy", "too_hard"])).toBe(0.9);
  });

  it("only steps up after two too-easy ratings in a row", () => {
    expect(nextIntensityFactor(1, ["too_easy"])).toBe(1);
    expect(nextIntensityFactor(1, ["just_right", "too_easy"])).toBe(1);
    expect(nextIntensityFactor(1, ["too_easy", "too_easy"])).toBe(1.1);
  });

  it("clamps the factor between 0.5 and 2", () => {
    expect(nextIntensityFactor(0.5, ["too_hard"])).toBe(0.5);
    expect(nextIntensityFactor(2, ["too_easy", "too_easy"])).toBe(2);
  });

  it("scales targets and never drops below one rep", () => {
    expect(scaleTarget(12, 1.1)).toBe(13);
    expect(scaleTarget(1, 0.5)).toBe(1);
  });
});
