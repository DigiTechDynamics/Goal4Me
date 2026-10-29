import { describe, expect, it } from "vitest";
import {
  isoDate,
  paynowCheckoutSchema,
  quizAnswersSchema,
  savingsGoalSchema,
  transactionSchema,
  type QuizAnswers,
} from "../index";

const validQuiz: QuizAnswers = {
  goal: "lose_weight",
  sex: "female",
  age: 29,
  heightCm: 165,
  weightKg: 78,
  targetWeightKg: 65,
  activity: "light",
  fitnessLevel: "beginner",
  problemAreas: ["belly"],
  limitations: [],
  daysPerWeek: 4,
  minutesPerSession: 15,
  country: "ZW",
};

const issuePaths = (result: {
  success: boolean;
  error?: { issues: { path: (string | number)[] }[] };
}) => result.error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("quizAnswersSchema", () => {
  it("accepts a complete set of answers", () => {
    expect(quizAnswersSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("rejects ages, heights and weights outside the supported range", () => {
    const result = quizAnswersSchema.safeParse({
      ...validQuiz,
      age: 15,
      heightCm: 300,
      weightKg: 20,
    });
    expect(issuePaths(result)).toEqual(expect.arrayContaining(["age", "heightCm", "weightKg"]));
  });

  it("rejects an underweight target", () => {
    const result = quizAnswersSchema.safeParse({ ...validQuiz, targetWeightKg: 48 });
    expect(issuePaths(result)).toContain("targetWeightKg");
  });

  it("requires guardian consent under 18", () => {
    expect(issuePaths(quizAnswersSchema.safeParse({ ...validQuiz, age: 17 }))).toContain(
      "guardianConsent",
    );
    expect(
      quizAnswersSchema.safeParse({ ...validQuiz, age: 17, guardianConsent: true }).success,
    ).toBe(true);
  });

  it("only allows the offered session lengths and launch countries", () => {
    expect(quizAnswersSchema.safeParse({ ...validQuiz, minutesPerSession: 25 }).success).toBe(
      false,
    );
    expect(quizAnswersSchema.safeParse({ ...validQuiz, country: "NG" }).success).toBe(false);
  });
});

describe("tracking schemas", () => {
  it("validates real calendar dates only", () => {
    expect(isoDate.safeParse("2026-02-28").success).toBe(true);
    expect(isoDate.safeParse("2026-02-30").success).toBe(false);
  });

  it("requires positive whole-cent transaction amounts", () => {
    const tx = {
      id: "6c3c1d43-5a2e-4c3e-9a7e-0b8f6b8b1a11",
      occurredOn: "2026-10-28",
      amountMinor: 1250,
      currency: "ZAR",
      categoryId: "0d5f2a8e-3c1b-4f7a-8e2d-1a2b3c4d5e6f",
    };
    expect(transactionSchema.safeParse(tx).success).toBe(true);
    expect(transactionSchema.safeParse({ ...tx, amountMinor: 12.5 }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...tx, currency: "EUR" }).success).toBe(false);
  });

  it("trims and defaults savings goals", () => {
    const parsed = savingsGoalSchema.parse({
      id: "6c3c1d43-5a2e-4c3e-9a7e-0b8f6b8b1a11",
      name: "  New phone ",
      targetMinor: 50_000,
      currency: "USD",
    });
    expect(parsed.name).toBe("New phone");
    expect(parsed.isEmergencyFund).toBe(false);
  });
});

describe("paynowCheckoutSchema", () => {
  it("requires a Zimbabwean mobile number for mobile money", () => {
    expect(
      paynowCheckoutSchema.safeParse({
        method: "ecocash",
        planId: "premium_yearly",
        phone: "0771234567",
      }).success,
    ).toBe(true);
    expect(
      paynowCheckoutSchema.safeParse({
        method: "ecocash",
        planId: "premium_yearly",
        phone: "12345",
      }).success,
    ).toBe(false);
    expect(
      paynowCheckoutSchema.safeParse({ method: "web", planId: "premium_weekly" }).success,
    ).toBe(true);
  });
});
