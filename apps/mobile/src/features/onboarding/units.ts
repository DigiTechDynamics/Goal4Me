import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, round } from "@goal4me/core";
import type { Units } from "./steps";

/** Display helpers for measurements; storage is always metric. */
export function formatWeight(kg: number, units: Units): string {
  return units === "metric" ? `${round(kg, 1)} kg` : `${Math.round(kgToLb(kg))} lb`;
}

export function formatHeight(cm: number, units: Units): string {
  if (units === "metric") return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′ ${Math.round(inches)}″`;
}

/** Converts a typed weight in the user's units to kg (null if not a number). */
export function parseWeight(text: string, units: Units): number | null {
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || text.trim() === "") return null;
  return round(units === "metric" ? value : lbToKg(value), 1);
}

export function parseHeight(cmOrFeet: string, inches: string, units: Units): number | null {
  const a = Number(cmOrFeet.replace(",", "."));
  if (!Number.isFinite(a) || cmOrFeet.trim() === "") return null;
  if (units === "metric") return round(a, 1);
  const b = inches.trim() === "" ? 0 : Number(inches.replace(",", "."));
  if (!Number.isFinite(b)) return null;
  return round(feetInchesToCm(a, b), 1);
}

const CM_PER_INCH = 2.54;

/** Weight as a number in the user's units (for charts and form defaults). */
export function weightInUnits(kg: number, units: Units): number {
  return units === "metric" ? round(kg, 1) : round(kgToLb(kg), 1);
}

/** Body measurements (waist, hips…): cm for metric, inches for imperial. */
export function formatLength(cm: number, units: Units, signed = false): string {
  const value = units === "metric" ? round(cm, 1) : round(cm / CM_PER_INCH, 1);
  const sign = signed && value > 0 ? "+" : "";
  // A true minus sign reads better than a hyphen next to numbers.
  return `${sign}${String(value).replace("-", "−")} ${units === "metric" ? "cm" : "in"}`;
}

export function lengthInUnits(cm: number, units: Units): number {
  return units === "metric" ? round(cm, 1) : round(cm / CM_PER_INCH, 1);
}

/** Converts a typed measurement to cm (null if empty or not a number). */
export function parseLength(text: string, units: Units): number | null {
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || text.trim() === "") return null;
  return round(units === "metric" ? value : value * CM_PER_INCH, 1);
}
