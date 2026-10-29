import { PROTEIN_G_PER_KG, WATER_ML_PER_KG } from "./constants";

/** Daily protein target in grams. */
export function proteinTargetG(weightKg: number): number {
  return Math.round(weightKg * PROTEIN_G_PER_KG);
}

/** Daily water target in ml, rounded to the nearest 50 ml (a typical glass marking). */
export function waterTargetMl(weightKg: number): number {
  return Math.round((weightKg * WATER_ML_PER_KG) / 50) * 50;
}
