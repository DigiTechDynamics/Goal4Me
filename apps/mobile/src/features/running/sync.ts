import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RunEffort } from "@goal4me/core";
import { useEffect } from "react";
import { AppState } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";
import { getSupabase } from "@/lib/supabase";
import { runningKeys } from "./api";

/**
 * Finished runs are saved on the phone first and sent when there's signal,
 * exactly like workouts (see features/workouts/syncQueue.ts): runs happen
 * outdoors, often far from Wi-Fi. Each run has a device-generated UUID and
 * log_run is idempotent, so retries are always safe.
 */
export interface PendingRun {
  sessionId: string;
  userId: string;
  planId: string;
  runNumber: number;
  week: number;
  startedAt: string;
  durationSec: number;
  distanceM: number | null;
  effort: RunEffort;
  notes: string | null;
  nextIntensity: number;
  attempts: number;
}

interface RunQueueState {
  pending: PendingRun[];
  enqueue: (run: Omit<PendingRun, "attempts">) => void;
  remove: (sessionId: string) => void;
  bumpAttempts: (sessionId: string) => void;
}

export const useRunQueue = create<RunQueueState>()(
  persist(
    (set) => ({
      pending: [],
      enqueue: (run) =>
        set((state) =>
          state.pending.some((p) => p.sessionId === run.sessionId)
            ? state
            : { pending: [...state.pending, { ...run, attempts: 0 }] },
        ),
      remove: (sessionId) =>
        set((state) => ({ pending: state.pending.filter((p) => p.sessionId !== sessionId) })),
      bumpAttempts: (sessionId) =>
        set((state) => ({
          pending: state.pending.map((p) =>
            p.sessionId === sessionId ? { ...p, attempts: p.attempts + 1 } : p,
          ),
        })),
    }),
    {
      name: "goal4me.run-queue.v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

/** Postgres "insufficient_privilege": a free account tried to log a premium run. */
const PREMIUM_REQUIRED = "42501";

let flushing: Promise<void> | null = null;

/** Sends every queued run for this user. Concurrent calls share one run. */
export function flushRunQueue(userId: string): Promise<void> {
  flushing ??= (async () => {
    const { pending, remove, bumpAttempts } = useRunQueue.getState();
    let sent = 0;
    for (const run of pending.filter((p) => p.userId === userId)) {
      const { error } = await getSupabase().rpc("log_run", {
        p_session_id: run.sessionId,
        p_plan_id: run.planId,
        p_run_number: run.runNumber,
        p_week: run.week,
        p_started_at: run.startedAt,
        p_duration_s: run.durationSec,
        p_distance_m: run.distanceM,
        p_effort: run.effort,
        p_notes: run.notes,
        p_next_intensity: run.nextIntensity,
      });
      if (error?.code === PREMIUM_REQUIRED) {
        // Premium lapsed between finishing and syncing: the server will never
        // accept this run, so drop it instead of retrying forever.
        logger.warn("Dropping a run the server refused as premium-only", { run: run.runNumber });
        remove(run.sessionId);
        continue;
      }
      if (error) {
        bumpAttempts(run.sessionId);
        logger.warn("Run sync failed; will retry", {
          code: error.code,
          attempts: run.attempts + 1,
        });
        break; // usually offline: the rest would fail too
      }
      remove(run.sessionId);
      sent += 1;
    }
    if (sent > 0) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: runningKeys.plan(userId) }),
        queryClient.invalidateQueries({ queryKey: runningKeys.history(userId) }),
        queryClient.invalidateQueries({ queryKey: ["home-summary", userId] }),
        queryClient.invalidateQueries({ queryKey: ["streak", userId] }),
      ]);
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

const RETRY_INTERVAL_MS = 60_000;

/** Keeps trying to send queued runs (launch, foreground, every minute). Returns the count. */
export function useRunSync(userId: string): number {
  const pendingCount = useRunQueue(
    (state) => state.pending.filter((p) => p.userId === userId).length,
  );

  useEffect(() => {
    if (pendingCount === 0) return;
    void flushRunQueue(userId);
    const timer = setInterval(() => void flushRunQueue(userId), RETRY_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void flushRunQueue(userId);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [userId, pendingCount]);

  return pendingCount;
}
