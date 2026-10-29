import { FREE_RUNS_PER_PROGRAM } from "@goal4me/core";
import { router } from "expo-router";
import { openPaywall } from "@/features/billing/gating";

/** Mirrors the database rule: the first runs of every plan are free. */
export const isRunLocked = (runNumber: number, isPremium: boolean): boolean =>
  !isPremium && runNumber > FREE_RUNS_PER_PROGRAM;

export type RunSessionState = "done" | "next" | "upcoming" | "locked";

/** How a plan's run shows in lists: done, the next one up, later, or Premium-only. */
export function runSessionState(
  runNumber: number,
  completedRuns: number,
  isPremium: boolean,
): RunSessionState {
  if (runNumber <= completedRuns) return "done";
  if (isRunLocked(runNumber, isPremium)) return "locked";
  return runNumber === completedRuns + 1 ? "next" : "upcoming";
}

/** Opens a run in the player, or the paywall when it's past the free runs. */
export function openRun(runNumber: number, isPremium: boolean) {
  if (isRunLocked(runNumber, isPremium)) {
    openPaywall("run");
    return;
  }
  router.push({ pathname: "/running/run/[runNumber]", params: { runNumber: String(runNumber) } });
}
