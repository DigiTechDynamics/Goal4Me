import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutRating } from "@goal4me/core";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/queryClient";
import { getSupabase } from "@/lib/supabase";

/**
 * Finished workouts are saved here first and then sent to the server, so a
 * workout done offline (common on mobile data in our launch markets) is
 * never lost. Each entry has a device-generated UUID and the server call is
 * idempotent, so retries are always safe.
 */
export interface PendingWorkout {
  sessionId: string;
  userId: string;
  programDayId: string;
  startedAt: string;
  durationSec: number;
  kcalEstimate: number;
  rating: WorkoutRating;
  nextIntensity: number;
  attempts: number;
}

interface SyncQueueState {
  pending: PendingWorkout[];
  enqueue: (workout: Omit<PendingWorkout, "attempts">) => void;
  remove: (sessionId: string) => void;
  bumpAttempts: (sessionId: string) => void;
}

export const useSyncQueue = create<SyncQueueState>()(
  persist(
    (set) => ({
      pending: [],
      enqueue: (workout) =>
        set((state) =>
          state.pending.some((p) => p.sessionId === workout.sessionId)
            ? state
            : { pending: [...state.pending, { ...workout, attempts: 0 }] },
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
      name: "goal4me.workout-queue.v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

let flushing: Promise<void> | null = null;

/** Sends every queued workout for this user. Concurrent calls share one run. */
export function flushWorkoutQueue(userId: string): Promise<void> {
  flushing ??= (async () => {
    const { pending, remove, bumpAttempts } = useSyncQueue.getState();
    let sent = 0;
    for (const workout of pending.filter((p) => p.userId === userId)) {
      const { error } = await getSupabase().rpc("log_workout", {
        p_session_id: workout.sessionId,
        p_program_day_id: workout.programDayId,
        p_started_at: workout.startedAt,
        p_duration_s: workout.durationSec,
        p_kcal_est: workout.kcalEstimate,
        p_rating: workout.rating,
        p_next_intensity: workout.nextIntensity,
      });
      if (error) {
        bumpAttempts(workout.sessionId);
        logger.warn("Workout sync failed; will retry", {
          code: error.code,
          attempts: workout.attempts + 1,
        });
        // Stop on the first failure: usually offline, so the rest would fail too.
        break;
      }
      remove(workout.sessionId);
      sent += 1;
    }
    if (sent > 0) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["program-plan", userId] }),
        queryClient.invalidateQueries({ queryKey: ["home-summary", userId] }),
        queryClient.invalidateQueries({ queryKey: ["streak", userId] }),
      ]);
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
