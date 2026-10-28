import { describe, expect, it } from "vitest";
import {
  activityStreak,
  addMonths,
  daysLeftInMonth,
  monthStart,
  nextMonthStart,
  parseMoneyInput,
  summariseBudget,
} from "../index";

describe("months", () => {
  it("finds the month boundaries", () => {
    expect(monthStart("2026-10-28")).toBe("2026-10-01");
    expect(nextMonthStart("2026-10-28")).toBe("2026-11-01");
    expect(nextMonthStart("2026-12-05")).toBe("2027-01-01");
    expect(daysLeftInMonth("2026-10-28")).toBe(4);
    expect(addMonths("2026-10-28", 12)).toBe("2027-10-28");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
});

describe("summariseBudget", () => {
  const categories = [
    { id: "rent", name: "Housing", bucket: "needs" as const, limitMinor: 50_000 },
    { id: "fun", name: "Fun", bucket: "wants" as const, limitMinor: 10_000 },
    { id: "debt", name: "Extra debt", bucket: "savings" as const, limitMinor: null },
  ];

  it("totals categories, buckets and the savings rate", () => {
    const summary = summariseBudget({
      incomeMinor: 200_000,
      categories,
      transactions: [
        { categoryId: "rent", amountMinor: 50_000 },
        { categoryId: "fun", amountMinor: 7_500 },
        { categoryId: "fun", amountMinor: 5_000 },
        { categoryId: "debt", amountMinor: 10_000 },
      ],
      netContributionsMinor: 20_000,
    });
    const fun = summary.categories.find((c) => c.id === "fun")!;
    expect(fun).toMatchObject({ spentMinor: 12_500, remainingMinor: -2_500, usage: 1.25 });
    expect(summary.categories.find((c) => c.id === "debt")!.remainingMinor).toBeNull();
    expect(summary.buckets).toEqual([
      { bucket: "needs", targetMinor: 100_000, actualMinor: 50_000 },
      { bucket: "wants", targetMinor: 60_000, actualMinor: 12_500 },
      { bucket: "savings", targetMinor: 40_000, actualMinor: 30_000 },
    ]);
    expect(summary.spentMinor).toBe(62_500);
    expect(summary.leftMinor).toBe(200_000 - 62_500 - 30_000);
    expect(summary.savingsRate).toBe(0.15);
  });

  it("never counts net withdrawals as negative savings", () => {
    const summary = summariseBudget({
      incomeMinor: 0,
      categories,
      transactions: [],
      netContributionsMinor: -5_000,
    });
    expect(summary.buckets[2]!.actualMinor).toBe(0);
    expect(summary.savingsRate).toBe(0);
  });
});

describe("activityStreak", () => {
  it("counts back from today, or from yesterday if today is empty", () => {
    const dates = ["2026-10-25", "2026-10-26", "2026-10-27"];
    expect(activityStreak(dates, "2026-10-28")).toBe(3);
    expect(activityStreak([...dates, "2026-10-28"], "2026-10-28")).toBe(4);
    expect(activityStreak(dates, "2026-10-29")).toBe(0);
    expect(activityStreak([], "2026-10-29")).toBe(0);
  });
});

describe("parseMoneyInput", () => {
  it("accepts common formats and returns minor units", () => {
    expect(parseMoneyInput("12")).toBe(1200);
    expect(parseMoneyInput("12.5")).toBe(1250);
    expect(parseMoneyInput("1,234.56")).toBe(123_456);
    expect(parseMoneyInput("1 234,56")).toBe(123_456);
    expect(parseMoneyInput("1.000.000")).toBe(100_000_000);
    expect(parseMoneyInput("1,000")).toBe(100_000);
  });

  it("rejects empty, zero, negative and non-numeric input", () => {
    for (const bad of ["", "0", "-5", "abc", "12.345.6x", "0,00"]) {
      expect(parseMoneyInput(bad)).toBeNull();
    }
  });
});
