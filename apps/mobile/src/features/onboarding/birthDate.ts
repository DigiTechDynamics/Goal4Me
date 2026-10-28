import { toIsoDate } from "@goal4me/core";

/**
 * The quiz asks for age, not a birthday, so we store an approximate birth
 * date (today minus `age` years). Age shown later is then correct to within
 * a year, which is all the calorie formula needs.
 */
export function approximateBirthDate(age: number, today = new Date()): string {
  const date = new Date(
    Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()),
  );
  return toIsoDate(date);
}
