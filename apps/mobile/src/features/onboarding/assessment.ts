import {
  buildHealthAssessment,
  pickProgram,
  type HealthAssessment,
  type ProgramChoice,
} from "@goal4me/core";
import type { QuizAnswers } from "@goal4me/schemas";

export interface QuizResult {
  assessment: HealthAssessment;
  program: ProgramChoice;
}

/** Everything the result screen shows, derived from finished quiz answers. */
export function resultFromAnswers(answers: QuizAnswers, today: string): QuizResult {
  return {
    assessment: buildHealthAssessment({
      sex: answers.sex,
      age: answers.age,
      heightCm: answers.heightCm,
      weightKg: answers.weightKg,
      targetWeightKg: answers.targetWeightKg,
      goal: answers.goal,
      activity: answers.activity,
      today,
    }),
    program: pickProgram(answers),
  };
}
