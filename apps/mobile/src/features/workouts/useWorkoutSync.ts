import { useEffect } from "react";
import { AppState } from "react-native";
import { flushWorkoutQueue, useSyncQueue } from "./syncQueue";

const RETRY_INTERVAL_MS = 60_000;

/**
 * Keeps trying to send queued workouts: on launch, whenever the app returns
 * to the foreground, when something new is queued, and every minute while
 * anything is still pending.
 */
export function useWorkoutSync(userId: string): number {
  const pendingCount = useSyncQueue(
    (state) => state.pending.filter((p) => p.userId === userId).length,
  );

  useEffect(() => {
    if (pendingCount === 0) return;
    void flushWorkoutQueue(userId);
    const timer = setInterval(() => void flushWorkoutQueue(userId), RETRY_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void flushWorkoutQueue(userId);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [userId, pendingCount]);

  return pendingCount;
}
