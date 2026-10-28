import { describe, expect, it } from "vitest";
import {
  emergencyFundTarget,
  formatMoney,
  fromMinor,
  monthlyContributionNeeded,
  moneyScore,
  split503020,
  SUPPORTED_CURRENCIES,
  toMinor,
} from "../index";

describe("minor units", () => {
  it("avoids floating point drift", () => {
    expect(toMinor(0.1) + toMinor(0.2)).toBe(toMinor(0.3));
    expect(toMinor(19.99)).toBe(1999);
    expect(fromMinor(1999)).toBe(19.99);
  });

  it("formats every launch currency", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(formatMoney(123456, currency, "en-US")).toMatch(/1,234\.56/);
    }
    expect(SUPPORTED_CURRENCIES).toEqual(["USD", "ZAR", "BWP", "ZMW", "MWK", "GBP", "INR"]);
  });
});

describe("budgeting", () => {
  it("splits 50/30/20 with the remainder in needs", () => {
    const split = split503020(100_001);
    expect(split).toEqual({ needsMinor: 50_001, wantsMinor: 30_000, savingsMinor: 20_000 });
    expect(split.needsMinor + split.wantsMinor + split.savingsMinor).toBe(100_001);
  });

  it("rejects fractional or negative income", () => {
    expect(() => split503020(10.5)).toThrow(RangeError);
    expect(() => split503020(-1)).toThrow(RangeError);
  });

  it("targets three months of expenses for the emergency fund", () => {
    expect(emergencyFundTarget(50_000)).toBe(150_000);
  });
});

describe("monthlyContributionNeeded", () => {
  const goal = { targetMinor: 120_000, savedMinor: 20_000, today: "2026-01-15" };

  it("spreads the remainder over the months left", () => {
    expect(monthlyContributionNeeded({ ...goal, dueDate: "2026-11-15" })).toBe(10_000);
  });

  it("rounds up to a whole unit so the goal is never missed", () => {
    expect(monthlyContributionNeeded({ ...goal, dueDate: "2026-04-15" })).toBe(33_400);
  });

  it("asks for everything left when the due date has passed", () => {
    expect(monthlyContributionNeeded({ ...goal, dueDate: "2025-12-01" })).toBe(100_000);
  });

  it("returns zero once the goal is reached", () => {
    expect(monthlyContributionNeeded({ ...goal, savedMinor: 150_000, dueDate: "2026-11-15" })).toBe(
      0,
    );
  });
});

describe("moneyScore", () => {
  it("scores 100 when every part is at full marks", () => {
    const result = moneyScore({
      savingsRate: 0.25,
      emergencyFundMonths: 4,
      lessonsCompleted: 30,
      totalLessons: 30,
      budgetStreakDays: 45,
    });
    expect(result.score).toBe(100);
  });

  it("scores 0 for a new user and handles zero lessons safely", () => {
    const result = moneyScore({
      savingsRate: 0,
      emergencyFundMonths: 0,
      lessonsCompleted: 0,
      totalLessons: 0,
      budgetStreakDays: 0,
    });
    expect(result.score).toBe(0);
  });

  it("gives partial credit per part", () => {
    const result = moneyScore({
      savingsRate: 0.1,
      emergencyFundMonths: 1.5,
      lessonsCompleted: 15,
      totalLessons: 30,
      budgetStreakDays: 15,
    });
    expect(result.breakdown).toEqual({ savings: 18, emergencyFund: 15, learning: 10, habits: 8 });
    expect(result.score).toBe(51);
  });

  it("ignores negative savings rates instead of going below zero", () => {
    expect(
      moneyScore({
        savingsRate: -0.5,
        emergencyFundMonths: 0,
        lessonsCompleted: 0,
        totalLessons: 30,
        budgetStreakDays: 0,
      }).breakdown.savings,
    ).toBe(0);
  });
});
