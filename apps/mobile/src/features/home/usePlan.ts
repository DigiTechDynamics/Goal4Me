import { buildHealthAssessment, type HealthAssessment } from "@goal4me/core";
import { useMemo } from "react";
import { localToday } from "@/lib/format";
import { ageFromBirthDate, type HomeSummary } from "./api";

/**
 * Recomputes today's targets from saved data, using the latest weigh-in, so
 * targets follow the user's progress automatically.
 */
export function usePlan(summary: HomeSummary | undefined): HealthAssessment | null {
  return useMemo(() => {
    const latest = summary?.weights[0];
    const { profile, goal } = summary ?? {};
    if (
      !profile ||
      !goal ||
      !latest ||
      !profile.sex ||
      !profile.birthDate ||
      profile.heightCm === null
    ) {
      return null;
    }
    try {
      return buildHealthAssessment({
        sex: profile.sex,
        age: ageFromBirthDate(profile.birthDate),
        heightCm: profile.heightCm,
        weightKg: latest.weightKg,
        targetWeightKg: goal.targetWeightKg,
        goal: goal.goal,
        activity: goal.activity,
        today: localToday(),
      });
    } catch {
      // Out-of-range stored data (shouldn't happen thanks to DB checks): show no plan.
      return null;
    }
  }, [summary]);
}
