import { GOAL_ENERGY_ADJUSTMENT, LIMITS, MIN_DAILY_KCAL } from "./constants";
import { assertInRange } from "./errors";
import type { ActivityLevel, Goal, Sex } from "./types";

/** Standard activity multipliers applied to BMR. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface BodyInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
}

/**
 * Basal metabolic rate (kcal/day), Mifflin-St Jeor equation:
 *   10·kg + 6.25·cm − 5·age + (5 for men, −161 for women)
 */
export function bmr({ sex, age, heightCm, weightKg }: BodyInput): number {
  assertInRange("age", age, LIMITS.ageYears.min, LIMITS.ageYears.max);
  assertInRange("heightCm", heightCm, LIMITS.heightCm.min, LIMITS.heightCm.max);
  assertInRange("weightKg", weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max);
  const sexConstant = sex === "male" ? 5 : -161;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant);
}

/** Total daily energy expenditure (kcal/day) = BMR × activity factor. */
export function tdee(body: BodyInput, activity: ActivityLevel): number {
  return Math.round(bmr(body) * ACTIVITY_FACTORS[activity]);
}

export interface CalorieTarget {
  kcal: number;
  /** True when the goal's deficit was capped by the safe minimum for this sex. */
  flooredAtMinimum: boolean;
}

/**
 * Daily calorie target for a goal: TDEE adjusted by the goal's deficit or
 * surplus, never below the safe minimum. Rounded to the nearest 10 kcal so
 * the UI doesn't suggest false precision.
 */
export function calorieTarget(tdeeKcal: number, goal: Goal, sex: Sex): CalorieTarget {
  const adjusted = tdeeKcal * (1 + GOAL_ENERGY_ADJUSTMENT[goal]);
  const minimum = MIN_DAILY_KCAL[sex];
  const flooredAtMinimum = adjusted < minimum;
  return {
    kcal: Math.round(Math.max(adjusted, minimum) / 10) * 10,
    flooredAtMinimum,
  };
}
