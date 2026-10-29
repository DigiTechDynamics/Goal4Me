import { addDays, daysBetween, parseIsoDate, type IsoDate } from "./dates";

/**
 * The server only updates a streak when a workout is logged, so a stored
 * "12 days" can be stale if the user stopped training. This mirrors the
 * database trigger (on_workout_logged) to show what the streak is *today*.
 */
export interface StoredStreak {
  currentDays: number;
  bestDays: number;
  lastActiveOn: IsoDate | null;
  freezesLeft: number;
  /** Monday of the week the freeze count belongs to. */
  freezeWeek: IsoDate | null;
}

export type StreakStatus =
  /** Trained today. */
  | "done_today"
  /** Streak alive; train today to extend it. */
  | "at_risk"
  /** One day was missed; training today uses the weekly freeze. */
  | "freeze_needed"
  /** No streak (never trained, or it ended). */
  | "none";

export interface LiveStreak {
  days: number;
  bestDays: number;
  status: StreakStatus;
}

/** Monday of the ISO week containing `date` (matches Postgres date_trunc('week')). */
export function weekStart(date: IsoDate): IsoDate {
  const weekday = parseIsoDate(date).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

export function liveStreak(stored: StoredStreak | null, today: IsoDate): LiveStreak {
  if (!stored?.lastActiveOn || stored.currentDays === 0) {
    return { days: 0, bestDays: stored?.bestDays ?? 0, status: "none" };
  }
  const gap = daysBetween(stored.lastActiveOn, today);
  // The freeze refills at the start of each week, exactly like the trigger.
  const freezeAvailable =
    stored.freezeWeek === null || stored.freezeWeek < weekStart(today) || stored.freezesLeft > 0;

  let status: StreakStatus;
  if (gap <= 0) status = "done_today";
  else if (gap === 1) status = "at_risk";
  else if (gap === 2 && freezeAvailable) status = "freeze_needed";
  else status = "none";

  return {
    days: status === "none" ? 0 : stored.currentDays,
    bestDays: stored.bestDays,
    status,
  };
}
