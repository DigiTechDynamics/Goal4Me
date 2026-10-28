import { INTENSITY } from "./constants";
import type { WorkoutRating } from "./types";
import { round } from "./units";

/**
 * Estimated energy burned: kcal = MET × body weight (kg) × hours.
 * MET values come from each exercise's content record (e.g. push-ups ≈ 8).
 */
export function estimateKcal(input: {
  met: number;
  weightKg: number;
  durationSec: number;
}): number {
  const { met, weightKg, durationSec } = input;
  if (met <= 0 || weightKg <= 0 || durationSec < 0) throw new RangeError("Invalid workout input");
  return Math.round(met * weightKg * (durationSec / 3600));
}

/**
 * Auto-progression after each workout. `ratings` are the user's ratings for
 * their programme, oldest first, including the one just given.
 *  - Latest rating "too hard"      → 10 % easier
 *  - Last two ratings "too easy"   → 10 % harder
 *  - Otherwise                     → unchanged
 * The factor is clamped to [0.5, 2] so a programme can't drift to extremes.
 */
export function nextIntensityFactor(current: number, ratings: readonly WorkoutRating[]): number {
  const last = ratings.at(-1);
  const previous = ratings.at(-2);
  let next = current;
  if (last === "too_hard") next = current * (1 - INTENSITY.step);
  else if (last === "too_easy" && previous === "too_easy") next = current * (1 + INTENSITY.step);
  return round(Math.min(INTENSITY.max, Math.max(INTENSITY.min, next)), 2);
}

/** Applies the intensity factor to a programme target (reps or seconds); never below 1. */
export function scaleTarget(base: number, factor: number): number {
  return Math.max(1, Math.round(base * factor));
}
