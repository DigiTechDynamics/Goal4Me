import { LIMITS, WORKOUT_RATINGS } from "@goal4me/core";
import { z } from "zod";
import { clientId, currency, isoDate, minorAmount } from "./common";

const optionalCm = z.number().min(20).max(250).optional();

export const bodyMetricSchema = z.object({
  id: clientId,
  measuredOn: isoDate,
  weightKg: z.number().min(LIMITS.weightKg.min).max(LIMITS.weightKg.max),
  waistCm: optionalCm,
  hipsCm: optionalCm,
  chestCm: optionalCm,
  armCm: optionalCm,
});
export type BodyMetricInput = z.infer<typeof bodyMetricSchema>;

export const workoutSessionSchema = z.object({
  id: clientId,
  programDayId: z.string().uuid(),
  startedAt: z.string().datetime({ offset: true }),
  // A 3-hour cap catches a player left running overnight.
  durationSec: z
    .number()
    .int()
    .min(1)
    .max(3 * 60 * 60),
  rating: z.enum(WORKOUT_RATINGS),
});
export type WorkoutSessionInput = z.infer<typeof workoutSessionSchema>;

export const dailyLogSchema = z.object({
  date: isoDate,
  waterMl: z.number().int().min(0).max(10_000).optional(),
  steps: z.number().int().min(0).max(150_000).optional(),
});
export type DailyLogInput = z.infer<typeof dailyLogSchema>;

export const transactionSchema = z.object({
  id: clientId,
  occurredOn: isoDate,
  amountMinor: minorAmount.min(1, "Enter an amount"),
  currency,
  categoryId: z.string().uuid(),
  note: z.string().trim().max(140).optional(),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const savingsGoalSchema = z.object({
  id: clientId,
  name: z.string().trim().min(1, "Name your goal").max(60),
  targetMinor: minorAmount.min(100, "Enter a target amount"),
  currency,
  dueOn: isoDate.optional(),
  isEmergencyFund: z.boolean().default(false),
});
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
