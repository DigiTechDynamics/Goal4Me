/**
 * Unit conversion. The database and every calculation use metric; imperial
 * exists only at the UI boundary.
 */

const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

/** Rounds to a fixed number of decimal places without float noise (e.g. 1.005). */
export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export const lbToKg = (lb: number): number => lb * KG_PER_LB;
export const kgToLb = (kg: number): number => kg / KG_PER_LB;

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

/** Converts cm to whole feet + inches (inches rounded to 1 decimal, never 12). */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = round(cm / CM_PER_INCH, 1);
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: round(totalInches - feet * 12, 1) };
}
