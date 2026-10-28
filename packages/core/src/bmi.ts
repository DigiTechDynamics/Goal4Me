import { ADULT_AGE, BMI_BANDS, LIMITS } from "./constants";
import { assertInRange } from "./errors";
import type { BmiCategory } from "./types";
import { round } from "./units";

/** BMI = weight (kg) / height (m)², rounded to 1 decimal place. */
export function calculateBmi(weightKg: number, heightCm: number): number {
  assertInRange("weightKg", weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max);
  assertInRange("heightCm", heightCm, LIMITS.heightCm.min, LIMITS.heightCm.max);
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

/** Maps a BMI to its WHO adult category. */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < BMI_BANDS.underweightBelow) return "underweight";
  if (bmi < BMI_BANDS.overweightFrom) return "healthy";
  if (bmi < BMI_BANDS.obeseFrom) return "overweight";
  return "obese";
}

/** The weight range (kg, 1 dp) that gives a healthy BMI at this height. */
export function healthyWeightRange(heightCm: number): { minKg: number; maxKg: number } {
  assertInRange("heightCm", heightCm, LIMITS.heightCm.min, LIMITS.heightCm.max);
  const heightM2 = (heightCm / 100) ** 2;
  return {
    minKg: round(BMI_BANDS.underweightBelow * heightM2, 1),
    // Just under the overweight boundary, so the max itself is still "healthy".
    maxKg: round((BMI_BANDS.overweightFrom - 0.1) * heightM2, 1),
  };
}

export interface BmiAssessment {
  bmi: number;
  category: BmiCategory;
  /**
   * False for 16–17 year olds: WHO adult cut-offs are only a rough guide
   * for them, so the UI shows a softer message instead of a hard band.
   */
  adultCutoffsApply: boolean;
}

export function assessBmi(input: {
  weightKg: number;
  heightCm: number;
  age: number;
}): BmiAssessment {
  const bmi = calculateBmi(input.weightKg, input.heightCm);
  return { bmi, category: bmiCategory(bmi), adultCutoffsApply: input.age >= ADULT_AGE };
}
