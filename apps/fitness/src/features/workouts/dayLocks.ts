import { usePremium } from "@goal4me/app-kit/billing/api";
import { isDayLocked } from "@goal4me/core";
import type { ProgramPlan } from "./api";

type Day = ProgramPlan["days"][number];

/**
 * Which programme days are locked for this user. The database enforces the
 * same rule; this only lets the app show a lock instead of an empty workout.
 * `ready` is false until premium status is known, so premium users never
 * see a lock flash on screen.
 */
export function useDayLocks(userId: string, plan: ProgramPlan | null | undefined) {
  const premium = usePremium(userId);
  const isPremium = premium.data?.isPremium ?? false;
  return {
    ready: premium.data !== undefined || premium.isError,
    isPremium,
    isLocked: (day: Day): boolean =>
      !!plan && plan.programIsPremium && isDayLocked(day, plan.days, isPremium),
  };
}
