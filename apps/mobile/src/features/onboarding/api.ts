import { LAUNCH_MARKETS, pickProgram } from "@goal4me/core";
import type { QuizAnswers } from "@goal4me/schemas";
import { getSupabase } from "@/lib/supabase";
import { approximateBirthDate } from "./birthDate";
import type { Units } from "./steps";

/** The device's IANA time zone (e.g. "Africa/Harare"), used for streak days. */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Saves all quiz answers in one database transaction (see complete_onboarding). */
export async function saveOnboarding(answers: QuizAnswers, units: Units): Promise<void> {
  const program = pickProgram(answers);
  const { error } = await getSupabase().rpc("complete_onboarding", {
    p_sex: answers.sex,
    p_birth_date: approximateBirthDate(answers.age),
    p_height_cm: answers.heightCm,
    p_weight_kg: answers.weightKg,
    p_units: units,
    p_country: answers.country,
    p_currency: LAUNCH_MARKETS[answers.country],
    p_timezone: deviceTimeZone(),
    p_goal: answers.goal,
    p_target_weight_kg: answers.targetWeightKg,
    p_activity: answers.activity,
    p_fitness_level: answers.fitnessLevel,
    p_problem_areas: answers.problemAreas,
    p_limitations: answers.limitations,
    p_days_per_week: answers.daysPerWeek,
    p_minutes_per_session: answers.minutesPerSession,
    p_money_goal: answers.moneyGoal ?? null,
    p_program_slug: program.slug,
    p_guardian_consent: answers.guardianConsent ?? false,
  });
  if (error) throw error;
}
