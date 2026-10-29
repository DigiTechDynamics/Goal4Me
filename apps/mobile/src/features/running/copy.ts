import type { RunEffort, RunSegmentKind, RunSessionType, Weekday } from "@goal4me/core";
import type { ColorToken } from "@/theme/tokens";

/** Display copy for running, kept out of the screens so wording stays consistent. */

export const SEGMENT_LABEL: Record<RunSegmentKind, string> = {
  warmup: "Warm up",
  run: "Run",
  walk: "Walk",
  easy: "Easy run",
  long: "Long run",
  tempo: "Tempo",
  fast: "Fast",
  recover: "Recover",
  stride: "Stride",
  race: "Race",
  cooldown: "Cool down",
};

/**
 * Segment colours: calm blues for easy effort, brand green for running,
 * warm tones as effort rises, so a session's shape reads at a glance.
 */
export const SEGMENT_COLOR: Record<RunSegmentKind, ColorToken> = {
  warmup: "textSubtle",
  cooldown: "textSubtle",
  walk: "info",
  recover: "info",
  run: "brand",
  easy: "brand",
  long: "brand",
  stride: "warning",
  tempo: "warning",
  fast: "danger",
  race: "danger",
};

export const SESSION_LABEL: Record<RunSessionType, string> = {
  run_walk: "Run–walk",
  recovery_walk: "Recovery walk",
  easy: "Easy",
  long: "Long run",
  tempo: "Tempo",
  intervals: "Intervals",
  strides: "Strides",
  race: "Race",
};

export const EFFORT_OPTIONS: { value: RunEffort; label: string; description: string }[] = [
  { value: "easy", label: "Easy", description: "I could have done more" },
  { value: "just_right", label: "Just right", description: "Challenging but doable" },
  { value: "hard", label: "Hard", description: "I struggled to finish" },
];

export const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 0, short: "M", long: "Monday" },
  { value: 1, short: "T", long: "Tuesday" },
  { value: 2, short: "W", long: "Wednesday" },
  { value: 3, short: "T", long: "Thursday" },
  { value: 4, short: "F", long: "Friday" },
  { value: 5, short: "S", long: "Saturday" },
  { value: 6, short: "S", long: "Sunday" },
];

/** Sensible run days for each frequency: spread out, long run at the weekend. */
export const DEFAULT_RUN_DAYS: Record<number, Weekday[]> = {
  2: [2, 5],
  3: [1, 3, 5],
  4: [0, 2, 4, 5],
  5: [0, 1, 3, 4, 5],
};

/** "Run for 1 minute 30" style spoken cue. */
export function spokenDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const minutes = m ? `${m} minute${m === 1 ? "" : "s"}` : "";
  const secs = s ? `${s} seconds` : "";
  return [minutes, secs].filter(Boolean).join(" ");
}

/** Parses "25:00", "1:45:30" or "45" (minutes) into seconds; null if not a time. */
export function parseFinishTime(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^\d{1,3}$/.test(trimmed)) return Number(trimmed) * 60;
  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  const nums = parts.map(Number);
  const [h, m, s] = nums.length === 3 ? nums : [0, ...nums];
  if ((m ?? 0) > 59 || (s ?? 0) > 59) return null;
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
}

/** "25:00" or "1:45:30". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "Mon 3 Nov" for a plan date, independent of the device time zone. */
export function formatRunDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** "5K", "10K", "half marathon" or "marathon" for a programme's goal distance. */
export function raceLabel(meters: number): string {
  if (meters <= 5000) return "5K";
  if (meters <= 10_000) return "10K";
  return meters < 30_000 ? "half marathon" : "marathon";
}
