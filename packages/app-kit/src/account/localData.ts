import AsyncStorage from "@react-native-async-storage/async-storage";
import { appConfig, type LocalDataScope } from "../app/config";
import { logger } from "../lib/logger";
import { QUERY_CACHE_KEY, queryClient } from "../lib/queryClient";

/**
 * Removes personal data cached on this device. Called on sign-out (shared
 * phones are common in our launch markets) and after account deletion.
 *
 * The kit clears what every app has (the query cache, in memory and on
 * disk); each app wipes its own stores through AppConfig.clearLocalData.
 * An app hook that fails is logged, never allowed to block the sign-out.
 */
export async function clearLocalData(scope: LocalDataScope): Promise<void> {
  queryClient.clear();
  try {
    await appConfig().clearLocalData?.(scope);
  } catch (error) {
    logger.error("Could not clear this app's local data", {
      message: error instanceof Error ? error.message : String(error),
    });
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
