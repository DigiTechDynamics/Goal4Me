import { WEEKLY_RATE } from "./constants";
import { addDays, type IsoDate } from "./dates";
import { round } from "./units";

/** Projections longer than this are capped: the UI shows "2+ years" instead. */
export const MAX_PROJECTION_WEEKS = 104;

export interface ProjectionPoint {
  week: number;
  date: IsoDate;
  weightKg: number;
}

export interface GoalProjection {
  /** Weeks needed to reach the target, or null if it exceeds MAX_PROJECTION_WEEKS. */
  weeks: number | null;
  goalDate: IsoDate | null;
  /** One point per week, for the result-screen chart. */
  points: ProjectionPoint[];
}

/**
 * Projects when the user reaches their target weight, assuming a steady
 * weekly change proportional to current weight (0.65 %/week loss, 0.25 %/week
 * gain). Proportional change compounds, so:
 *   weeks = ln(target / current) / ln(1 ± rate)
 */
export function projectGoal(input: {
  currentKg: number;
  targetKg: number;
  startDate: IsoDate;
}): GoalProjection {
  const { currentKg, targetKg, startDate } = input;
  if (currentKg <= 0 || targetKg <= 0) throw new RangeError("Weights must be positive");

  if (round(currentKg, 1) === round(targetKg, 1)) {
    return {
      weeks: 0,
      goalDate: startDate,
      points: [{ week: 0, date: startDate, weightKg: currentKg }],
    };
  }

  const losing = targetKg < currentKg;
  const factor = losing ? 1 - WEEKLY_RATE.loss : 1 + WEEKLY_RATE.gain;
  const exactWeeks = Math.log(targetKg / currentKg) / Math.log(factor);
  const weeks = Math.ceil(exactWeeks - 1e-9);
  const reachable = weeks <= MAX_PROJECTION_WEEKS;
  const lastWeek = reachable ? weeks : MAX_PROJECTION_WEEKS;

  const points: ProjectionPoint[] = [];
  for (let week = 0; week <= lastWeek; week++) {
    const projected = currentKg * factor ** week;
    // Never overshoot the target on the final point.
    const weightKg = losing ? Math.max(projected, targetKg) : Math.min(projected, targetKg);
    points.push({ week, date: addDays(startDate, week * 7), weightKg: round(weightKg, 1) });
  }

  return {
    weeks: reachable ? weeks : null,
    goalDate: reachable ? addDays(startDate, weeks * 7) : null,
    points,
  };
}
