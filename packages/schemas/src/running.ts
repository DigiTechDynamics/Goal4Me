import {
  LONGEST_RUN_OPTIONS,
  RUN_EFFORTS,
  RUN_PROGRAM_SLUGS,
  type RunProgramSlug,
} from "@goal4me/core";
import { z } from "zod";
import { clientId, isoDate } from "./common";

const weekday = z.number().int().min(0).max(6);

export const runnerAnswersSchema = z.object({
  longestRun: z.enum(LONGEST_RUN_OPTIONS),
  runsPerWeek: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});

/**
 * A runner's programme settings, as stored in run_plans.settings. The core
 * plan builder re-checks day rules and race timing with friendlier errors.
 */
export const runSettingsSchema = z
  .object({
    program: z.enum(RUN_PROGRAM_SLUGS as [RunProgramSlug, ...RunProgramSlug[]]),
    daysPerWeek: z.number().int().min(2).max(5),
    runDays: z.array(weekday).min(2).max(5),
    longRunDay: weekday,
    startDate: isoDate,
    raceDate: isoDate.nullable(),
    units: z.enum(["km", "mi"]),
    // 12 minutes (a fast 5K) to 7 hours (a walk-run marathon).
    targetSeconds: z
      .number()
      .int()
      .min(12 * 60, "That's faster than a world record")
      .max(7 * 60 * 60, "Pick a time under 7 hours")
      .nullable(),
  })
  .refine(
    (s) => new Set(s.runDays).size === s.runDays.length && s.runDays.length === s.daysPerWeek,
    {
      message: "Pick one different day for each run",
      path: ["runDays"],
    },
  )
  .refine((s) => s.runDays.includes(s.longRunDay), {
    message: "Your long-run day must be one of your run days",
    path: ["longRunDay"],
  })
  .refine((s) => !s.raceDate || s.raceDate > s.startDate, {
    message: "Race day must be after your start date",
    path: ["raceDate"],
  });
export type RunSettingsInput = z.infer<typeof runSettingsSchema>;

export const runLogSchema = z.object({
  id: clientId,
  planId: z.string().uuid(),
  runNumber: z.number().int().min(1).max(200),
  week: z.number().int().min(1).max(60),
  startedAt: z.string().datetime({ offset: true }),
  // Up to 7 hours: a walk-run marathon.
  durationSec: z
    .number()
    .int()
    .min(60)
    .max(7 * 60 * 60),
  distanceM: z.number().int().min(0).max(100_000).nullable(),
  effort: z.enum(RUN_EFFORTS),
  notes: z.string().trim().max(500).nullable(),
});
export type RunLogInput = z.infer<typeof runLogSchema>;
