import type { RunSegmentKind } from "./running";

/**
 * Pace zones from one goal time. Paces are seconds per kilometre internally
 * and converted only for display, like weights are kept in kg.
 */

export const METERS_PER_MILE = 1609.344;

/**
 * Riegel's formula: predicts a time over another distance from one result.
 * The 1.06 exponent is the widely used fatigue factor for trained amateurs.
 */
export function riegel(seconds: number, fromMeters: number, toMeters: number): number {
  return seconds * (toMeters / fromMeters) ** 1.06;
}

export type PaceZone = "easy" | "long" | "tempo" | "interval" | "race";

/** [fastest, slowest] seconds per km. */
export type PaceRange = readonly [number, number];

/**
 * Zones are set from the runner's 5K-equivalent pace, a common coaching
 * shortcut: easy runs 25–40% slower, tempo 6–12% slower, repeats at or just
 * under 5K pace. Race pace is the goal itself.
 */
export function paceZones(goalMeters: number, targetSeconds: number): Record<PaceZone, PaceRange> {
  const fiveK = riegel(targetSeconds, goalMeters, 5000) / 5;
  const race = targetSeconds / (goalMeters / 1000);
  const band = (lo: number, hi: number): PaceRange => [fiveK * lo, fiveK * hi];
  return {
    easy: band(1.25, 1.4),
    long: band(1.3, 1.45),
    tempo: band(1.06, 1.12),
    interval: band(0.96, 1.0),
    race: [race, race],
  };
}

/** Which pace zone (if any) a segment is run at. */
export const ZONE_FOR_SEGMENT: Partial<Record<RunSegmentKind, PaceZone>> = {
  easy: "easy",
  long: "long",
  tempo: "tempo",
  fast: "interval",
  race: "race",
};

/** How each effort should feel, for runners without a goal time. */
export const EFFORT_CUE: Record<RunSegmentKind, string> = {
  warmup: "Brisk walk or very easy jog",
  run: "Easy jog: you can still talk",
  walk: "Brisk walk, catch your breath",
  easy: "Conversational: you can talk in sentences",
  long: "Slow and steady: you could keep going",
  tempo: "Comfortably hard: a few words at a time",
  fast: "Hard but controlled: 8 out of 10",
  recover: "Easy jog or walk until your breathing settles",
  stride: "Quick and relaxed, about 90% speed",
  race: "Race effort: start steady, finish strong",
  cooldown: "Walk it off and stretch",
};

/** "5:30 /km" or "8:51 /mi". */
export function formatPace(secondsPerKm: number, units: "km" | "mi"): string {
  const perUnit = units === "km" ? secondsPerKm : secondsPerKm * (METERS_PER_MILE / 1000);
  const rounded = Math.round(perUnit);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")} /${units}`;
}

/** "5:30–6:10 /km"; a single pace when the range is one value. */
export function formatPaceRange(range: PaceRange, units: "km" | "mi"): string {
  const [fast, slow] = range;
  if (Math.round(fast) === Math.round(slow)) return formatPace(fast, units);
  const lo = formatPace(fast, units).split(" ")[0];
  return `${lo}–${formatPace(slow, units)}`;
}

/** "45 min", "1 h 20 min", or "1:30" style clock for short segments. */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 600 && s % 60 !== 0) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Distance for display: "5.0 km" or "3.1 mi". */
export function formatDistance(meters: number, units: "km" | "mi"): string {
  const value = units === "km" ? meters / 1000 : meters / METERS_PER_MILE;
  return `${value.toFixed(value < 100 ? 1 : 0)} ${units}`;
}
