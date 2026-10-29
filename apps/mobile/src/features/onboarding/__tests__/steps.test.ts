import { describe, expect, it } from "vitest";
import { approximateBirthDate } from "../birthDate";
import { resultFromAnswers } from "../assessment";
import {
  EMPTY_DRAFT,
  firstIncompleteStep,
  STEPS,
  stepIndex,
  toQuizAnswers,
  validateStep,
  type QuizDraft,
} from "../steps";
import { formatHeight, formatWeight, parseHeight, parseWeight } from "../units";

const step = (id: string) => STEPS[stepIndex(id)]!;

const complete: QuizDraft = {
  units: "metric",
  goal: "lose_weight",
  sex: "female",
  age: 30,
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
  disclaimerAccepted: true,
  healthConsent: true,
};

describe("quiz steps", () => {
  it("has unique ids and ends with consent", () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
    expect(STEPS.at(-1)?.kind).toBe("consent");
  });

  it("requires an answer for single-choice steps unless optional", () => {
    expect(validateStep(step("goal"), EMPTY_DRAFT)).toBe("Choose an option");
    expect(validateStep(step("money"), EMPTY_DRAFT)).toBeNull();
  });

  it("validates ranges using the shared schema", () => {
    expect(validateStep(step("age"), { ...EMPTY_DRAFT, age: 12 })).toMatch(/at least 16/);
    expect(validateStep(step("age"), { ...EMPTY_DRAFT, age: 30 })).toBeNull();
    expect(validateStep(step("height"), { ...EMPTY_DRAFT, heightCm: 300 })).toMatch(/at most 230/);
  });

  it("requires at least one focus area but allows no limitations", () => {
    expect(validateStep(step("areas"), EMPTY_DRAFT)).toBe("Pick at least one area");
    expect(validateStep(step("limitations"), EMPTY_DRAFT)).toBeNull();
  });

  it("blocks an underweight target with a concrete suggestion", () => {
    expect(validateStep(step("target"), { ...complete, targetWeightKg: 45 })).toBe(
      "For your height, aim for at least 50.4 kg",
    );
  });

  it("requires both agreements, plus guardian consent under 18", () => {
    const consent = step("consent");
    expect(validateStep(consent, { ...complete, healthConsent: false })).toMatch(/agree to both/);
    expect(validateStep(consent, { ...complete, age: 17 })).toMatch(/guardian/);
    expect(validateStep(consent, { ...complete, age: 17, guardianConsent: true })).toBeNull();
  });

  it("resumes at the first unanswered step", () => {
    expect(firstIncompleteStep(EMPTY_DRAFT)).toBe(0);
    expect(firstIncompleteStep({ ...complete, activity: undefined })).toBe(stepIndex("activity"));
  });

  it("produces validated answers only when everything is complete", () => {
    expect(toQuizAnswers({ ...complete, healthConsent: false })).toBeNull();
    expect(toQuizAnswers(complete)).toMatchObject({ goal: "lose_weight", country: "ZW" });
  });
});

describe("result", () => {
  it("combines the health assessment and programme choice", () => {
    const answers = toQuizAnswers(complete)!;
    const { assessment, program } = resultFromAnswers(answers, "2026-11-02");
    expect(assessment.bmi.bmi).toBe(28.7);
    expect(program.slug).toBe("fat-burn-home");
  });
});

describe("units", () => {
  it("parses and formats weights in both systems", () => {
    expect(parseWeight("70,5", "metric")).toBe(70.5);
    expect(parseWeight("154", "imperial")).toBe(69.9);
    expect(parseWeight("", "metric")).toBeNull();
    expect(parseWeight("abc", "metric")).toBeNull();
    expect(formatWeight(69.9, "imperial")).toBe("154 lb");
  });

  it("parses and formats heights in both systems", () => {
    expect(parseHeight("5", "10", "imperial")).toBe(177.8);
    expect(parseHeight("172", "", "metric")).toBe(172);
    expect(formatHeight(177.8, "imperial")).toBe("5′ 10″");
  });
});

describe("approximateBirthDate", () => {
  it("subtracts the age in years from today", () => {
    expect(approximateBirthDate(30, new Date(Date.UTC(2026, 9, 28)))).toBe("1996-10-28");
  });
});
