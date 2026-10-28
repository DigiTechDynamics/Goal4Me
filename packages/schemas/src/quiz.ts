import {
  ACTIVITY_LEVELS,
  BMI_BANDS,
  GOALS,
  LAUNCH_MARKETS,
  LIMITS,
  SEXES,
  type CountryCode,
} from "@goal4me/core";
import { z } from "zod";

export const FITNESS_LEVELS = ["none", "beginner", "intermediate", "advanced"] as const;
export const PROBLEM_AREAS = ["arms", "belly", "legs", "back", "full_body"] as const;
export const LIMITATIONS = ["knees", "back", "wrists"] as const;
export const SESSION_MINUTES = [10, 15, 20, 30] as const;
export const MONEY_GOALS = [
  "build_emergency_fund",
  "pay_off_debt",
  "save_for_purchase",
  "start_investing",
  "budget_better",
] as const;

const countryCodes = Object.keys(LAUNCH_MARKETS) as [CountryCode, ...CountryCode[]];

const range = (field: { min: number; max: number }, label: string) =>
  z
    .number({ invalid_type_error: `Enter your ${label}` })
    .min(field.min, `${label} must be at least ${field.min}`)
    .max(field.max, `${label} must be at most ${field.max}`);

/**
 * Answers collected by the onboarding quiz (metric; the UI converts
 * imperial before validating). The same schema validates the request on the
 * server, so a modified client can't submit impossible values.
 */
export const quizAnswersSchema = z
  .object({
    goal: z.enum(GOALS),
    sex: z.enum(SEXES),
    age: range(LIMITS.ageYears, "Age").int(),
    heightCm: range(LIMITS.heightCm, "Height"),
    weightKg: range(LIMITS.weightKg, "Weight"),
    targetWeightKg: range(LIMITS.weightKg, "Target weight"),
    activity: z.enum(ACTIVITY_LEVELS),
    fitnessLevel: z.enum(FITNESS_LEVELS),
    problemAreas: z.array(z.enum(PROBLEM_AREAS)).min(1, "Pick at least one area").max(5),
    limitations: z.array(z.enum(LIMITATIONS)).max(3),
    daysPerWeek: range(LIMITS.daysPerWeek, "Days per week").int(),
    minutesPerSession: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)]),
    country: z.enum(countryCodes),
    // Optional money snapshot: users can skip it.
    moneyGoal: z.enum(MONEY_GOALS).optional(),
    guardianConsent: z.boolean().optional(),
  })
  .superRefine((answers, ctx) => {
    // Never let someone set a target that would make them underweight.
    const targetBmi = answers.targetWeightKg / (answers.heightCm / 100) ** 2;
    if (targetBmi < BMI_BANDS.underweightBelow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetWeightKg"],
        message: "This target is below a healthy weight for your height",
      });
    }
    // 16 and 17 year olds need a guardian's consent (spec: Compliance).
    if (answers.age < 18 && answers.guardianConsent !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianConsent"],
        message: "A parent or guardian must agree before you continue",
      });
    }
  });

export type QuizAnswers = z.infer<typeof quizAnswersSchema>;
