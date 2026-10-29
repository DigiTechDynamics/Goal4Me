/** Shared domain types. Kept as string unions so they map 1:1 to Postgres enums. */

export type Sex = "female" | "male";

export type Goal = "lose_weight" | "tone_up" | "build_strength" | "get_flexible";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export type BmiCategory = "underweight" | "healthy" | "overweight" | "obese";

export type WorkoutRating = "too_easy" | "just_right" | "too_hard";

export const SEXES = ["female", "male"] as const satisfies readonly Sex[];
export const GOALS = [
  "lose_weight",
  "tone_up",
  "build_strength",
  "get_flexible",
] as const satisfies readonly Goal[];
export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const satisfies readonly ActivityLevel[];
export const WORKOUT_RATINGS = [
  "too_easy",
  "just_right",
  "too_hard",
] as const satisfies readonly WorkoutRating[];
