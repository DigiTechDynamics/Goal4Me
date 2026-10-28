/**
 * Free tier rules (spec: Monetisation). The database enforces the same rules
 * (migration 20261028070000_premium_gating.sql); the app uses these to show
 * locks before the user hits a wall.
 */
export const FREE_WORKOUTS_PER_PROGRAM = 3;

/** Day number of the last free day: the 3rd workout day (rest days don't count). */
export function freeDayLimit(days: readonly { dayNumber: number; isRestDay: boolean }[]): number {
  const workoutDays = days
    .filter((d) => !d.isRestDay)
    .map((d) => d.dayNumber)
    .sort((a, b) => a - b);
  return workoutDays[FREE_WORKOUTS_PER_PROGRAM - 1] ?? workoutDays.at(-1) ?? 0;
}

export function isDayLocked(
  day: { dayNumber: number; isRestDay: boolean },
  days: readonly { dayNumber: number; isRestDay: boolean }[],
  isPremium: boolean,
): boolean {
  return !isPremium && !day.isRestDay && day.dayNumber > freeDayLimit(days);
}
