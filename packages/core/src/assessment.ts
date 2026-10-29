import { assessBmi, healthyWeightRange, type BmiAssessment } from "./bmi";
import type { IsoDate } from "./dates";
import { bmr, calorieTarget, tdee, type CalorieTarget } from "./energy";
import { proteinTargetG, waterTargetMl } from "./nutrition";
import { projectGoal, type GoalProjection } from "./projection";
import type { ActivityLevel, Goal, Sex } from "./types";

export interface AssessmentInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  goal: Goal;
  activity: ActivityLevel;
  today: IsoDate;
}

export interface HealthAssessment {
  bmi: BmiAssessment;
  healthyRangeKg: { minKg: number; maxKg: number };
  bmrKcal: number;
  tdeeKcal: number;
  /**
   * Null when the user is underweight: the spec says we show a
   * "talk to a professional" message instead of a calorie number.
   */
  calorieTarget: CalorieTarget | null;
  proteinG: number;
  waterMl: number;
  projection: GoalProjection;
}

/**
 * Everything the quiz result screen needs, computed in one place so the app
 * and the server (plan generation) always agree.
 */
export function buildHealthAssessment(input: AssessmentInput): HealthAssessment {
  const body = {
    sex: input.sex,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
  };
  const bmi = assessBmi(body);
  const tdeeKcal = tdee(body, input.activity);

  return {
    bmi,
    healthyRangeKg: healthyWeightRange(input.heightCm),
    bmrKcal: bmr(body),
    tdeeKcal,
    calorieTarget:
      bmi.category === "underweight" ? null : calorieTarget(tdeeKcal, input.goal, input.sex),
    proteinG: proteinTargetG(input.weightKg),
    waterMl: waterTargetMl(input.weightKg),
    projection: projectGoal({
      currentKg: input.weightKg,
      targetKg: input.targetWeightKg,
      startDate: input.today,
    }),
  };
}
