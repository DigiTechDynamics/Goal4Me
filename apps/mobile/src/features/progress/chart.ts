import { daysBetween } from "@goal4me/core";

/**
 * Pure geometry for the weight chart, kept free of React so it can be unit
 * tested. X is proportional to time (gaps between weigh-ins stay visible),
 * Y covers the data plus the goal line, padded and rounded to whole units.
 */
export interface ChartPoint {
  date: string;
  value: number;
}

export interface ChartBox {
  width: number;
  height: number;
  /** Space reserved on the left for axis labels. */
  left: number;
  top: number;
  bottom: number;
  right: number;
}

export interface ChartGeometry {
  /** SVG path for the series; empty when there are no points. */
  path: string;
  dots: { x: number; y: number }[];
  ticks: { y: number; value: number }[];
  /** Y position of the goal line, if a goal was given. */
  goalY: number | null;
  min: number;
  max: number;
}

const TICK_COUNT = 4;

/** Chooses a "nice" step (1, 2 or 5 × 10ⁿ) so tick labels read cleanly. */
export function niceStep(range: number, count = TICK_COUNT): number {
  const raw = Math.max(range, 1e-9) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const nice = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function buildChart(
  points: readonly ChartPoint[],
  box: ChartBox,
  goal: number | null = null,
): ChartGeometry {
  const values = points.map((p) => p.value);
  if (goal !== null) values.push(goal);
  if (values.length === 0) return { path: "", dots: [], ticks: [], goalY: null, min: 0, max: 0 };

  // At least a 2-unit window around the data, so a flat line sits mid-chart
  // instead of daily noise of 0.1 kg looking like a cliff.
  const centre = (Math.min(...values) + Math.max(...values)) / 2;
  const rawMin = Math.min(Math.min(...values), centre - 1);
  const rawMax = Math.max(Math.max(...values), centre + 1);
  const step = niceStep(rawMax - rawMin);
  const min = Math.floor((rawMin - step / 2) / step) * step;
  const max = Math.ceil((rawMax + step / 2) / step) * step;

  const plotW = box.width - box.left - box.right;
  const plotH = box.height - box.top - box.bottom;
  const y = (value: number) => box.top + plotH * (1 - (value - min) / (max - min));

  const first = points[0]?.date;
  const last = points.at(-1)?.date;
  const span = first && last ? daysBetween(first, last) : 0;
  // A single point (or same-day points) sits in the middle.
  const x = (date: string) =>
    span === 0 || !first
      ? box.left + plotW / 2
      : box.left + (plotW * daysBetween(first, date)) / span;

  const dots = points.map((p) => ({ x: round1(x(p.date)), y: round1(y(p.value)) }));
  const path = dots.map((d, i) => `${i === 0 ? "M" : "L"}${d.x},${d.y}`).join(" ");

  const ticks: { y: number; value: number }[] = [];
  for (let v = min; v <= max + step / 1000; v += step) {
    const value = Math.round(v * 1000) / 1000;
    ticks.push({ y: round1(y(value)), value });
  }

  return { path, dots, ticks, goalY: goal === null ? null : round1(y(goal)), min, max };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
