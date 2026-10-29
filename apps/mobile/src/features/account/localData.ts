import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOnboardingStore } from "@/features/onboarding/store";
import { useSyncQueue } from "@/features/workouts/syncQueue";
import { logger } from "@/lib/logger";
import { QUERY_CACHE_KEY, queryClient } from "@/lib/queryClient";

/**
 * Removes personal data cached on this device. Called on sign-out (shared
 * phones are common in our launch markets) and after account deletion.
 *
 * Unsynced workouts survive a normal sign-out, because they belong to the
 * user and are sent the next time they sign in. Deleting the account drops
 * them too.
 */
export async function clearLocalData({
  userId,
  dropUnsyncedWorkouts,
}: {
  userId: string | null;
  dropUnsyncedWorkouts: boolean;
}): Promise<void> {
  queryClient.clear();
  useOnboardingStore.getState().reset();
  if (dropUnsyncedWorkouts && userId) {
    const { pending, remove } = useSyncQueue.getState();
    for (const workout of pending.filter((p) => p.userId === userId)) remove(workout.sessionId);
  }
  try {
    await AsyncStorage.removeItem(QUERY_CACHE_KEY);
  } catch (error) {
    // The in-memory cache is already gone; a stale file is overwritten on next save.
    logger.warn("Could not remove the saved query cache", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
