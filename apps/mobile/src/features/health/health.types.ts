/**
 * Writing Goal4Me data to the phone's health store: Apple Health on iOS,
 * Health Connect on Android. One interface, three implementations
 * (health.ios.ts, health.android.ts, and health.ts for the web, where
 * there is no health store). Goal4Me only writes; it never reads health data.
 */
export interface WeightEntry {
  /** Our body_metrics id, used so a re-saved day replaces rather than duplicates. */
  id: string;
  /** YYYY-MM-DD; recorded at local noon so it lands on the right day. */
  measuredOn: string;
  weightKg: number;
}

export interface WorkoutEntry {
  /** Our workout or run session id (same dedupe idea as above). */
  id: string;
  /** Strength workouts are the default; runs are saved as running sessions. */
  activity?: "strength" | "running";
  startedAt: string;
  durationSec: number;
  kcal: number;
}

export interface HealthStore {
  /** "Apple Health" / "Health Connect", or null where unsupported. */
  name: string | null;
  isAvailable(): Promise<boolean>;
  /** Shows the system permission sheet; true if the user allowed writing. */
  requestAccess(): Promise<boolean>;
  writeWeight(entry: WeightEntry): Promise<void>;
  writeWorkout(entry: WorkoutEntry): Promise<void>;
}

/** Local noon of a calendar day, so time zones never move it to another day. */
export function noonOf(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}
