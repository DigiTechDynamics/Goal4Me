import { round } from "./units";

/**
 * Body-progress maths for the Progress tab. Inputs are sorted oldest → newest.
 */
export interface WeighIn {
  measuredOn: string;
  weightKg: number;
}

export const MEASUREMENT_KEYS = ["waistCm", "hipsCm", "chestCm", "armCm"] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];
export type Measurements = Partial<Record<MeasurementKey, number | null>>;

/**
 * Share of the way from the starting weight to the target, 0–1. Works for
 * losing and gaining; moving the wrong way counts as 0, overshooting as 1.
 */
export function goalProgress(startKg: number, currentKg: number, targetKg: number): number {
  const total = targetKg - startKg;
  if (total === 0) return 1;
  return Math.min(1, Math.max(0, (currentKg - startKg) / total));
}

/**
 * Trailing moving average over the last `window` weigh-ins. Daily weight
 * swings 1–2 kg with water and food, so the trend line is what users
 * should judge progress by.
 */
export function movingAverage(entries: readonly WeighIn[], window = 7): WeighIn[] {
  if (window < 1) throw new RangeError("window must be at least 1");
  return entries.map((entry, i) => {
    const slice = entries.slice(Math.max(0, i - window + 1), i + 1);
    const mean = slice.reduce((sum, e) => sum + e.weightKg, 0) / slice.length;
    return { measuredOn: entry.measuredOn, weightKg: round(mean, 1) };
  });
}

export interface MeasurementChange {
  key: MeasurementKey;
  latest: number;
  /** Change since the first entry that had this measurement; null if only one. */
  change: number | null;
}

/** Latest value and change for each body measurement the user has ever logged. */
export function measurementChanges(
  entries: readonly (Measurements & { measuredOn: string })[],
): MeasurementChange[] {
  const result: MeasurementChange[] = [];
  for (const key of MEASUREMENT_KEYS) {
    const values = entries.map((e) => e[key]).filter((v): v is number => typeof v === "number");
    const first = values[0];
    const latest = values.at(-1);
    if (first === undefined || latest === undefined) continue;
    result.push({ key, latest, change: values.length > 1 ? round(latest - first, 1) : null });
  }
  return result;
}

/** Entries on or after `fromDate` (inclusive); null returns everything. */
export function sinceDate<T extends { measuredOn: string }>(
  entries: readonly T[],
  fromDate: string | null,
): T[] {
  return fromDate === null ? [...entries] : entries.filter((e) => e.measuredOn >= fromDate);
}
