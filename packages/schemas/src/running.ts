import { RUN_GOALS, RUN_PLAN_LIMITS, RUNNER_LEVELS, WORKOUT_RATINGS } from "@goal4me/core";
import { z } from "zod";
import { clientId, isoDate } from "./common";

export const runPlanSchema = z.object({
  id: clientId,
  level: z.enum(RUNNER_LEVELS),
  goal: z.enum(RUN_GOALS),
  daysPerWeek: z
    .number()
    .int()
    .min(RUN_PLAN_LIMITS.daysPerWeek.min)
    .max(RUN_PLAN_LIMITS.daysPerWeek.max),
  weeks: z.number().int().min(RUN_PLAN_LIMITS.weeks.min).max(RUN_PLAN_LIMITS.weeks.max),
  startedOn: isoDate,
});
export type RunPlanInput = z.infer<typeof runPlanSchema>;

/** Matches the run_logs check constraints. */
export const runLogSchema = z.object({
  planId: z.string().uuid(),
  week: z.number().int().min(1).max(RUN_PLAN_LIMITS.weeks.max),
  sessionIndex: z
    .number()
    .int()
    .min(0)
    .max(RUN_PLAN_LIMITS.daysPerWeek.max - 1),
  completedOn: isoDate,
  minutes: z.number().int().min(1, "Enter your time in minutes").max(600).optional(),
  distanceKm: z.number().gt(0, "Enter a distance above 0").max(200).optional(),
  rating: z.enum(WORKOUT_RATINGS),
});
export type RunLogInput = z.infer<typeof runLogSchema>;
