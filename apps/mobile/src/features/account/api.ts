import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { PHOTO_BUCKET } from "@/features/progress/photos";
import { localToday } from "@/lib/format";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import { clearLocalData } from "./localData";

/**
 * Account self-service required by the app stores and by data-protection
 * law in our markets (GDPR in the UK, POPIA in South Africa, Zimbabwe's
 * Cyber and Data Protection Act): download everything, or delete it all.
 */

/** Fetches the export and hands it to the user as a JSON file. */
export async function exportMyData(): Promise<void> {
  const { data, error } = await getSupabase().rpc("export_my_data");
  if (error) throw error;
  const json = JSON.stringify(data, null, 2);
  const fileName = `goal4me-data-${localToday()}.json`;

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device");
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(json);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json" });
  } finally {
    // The share sheet has its own copy by now; don't leave health data in the cache.
    try {
      file.delete();
    } catch {
      logger.warn("Could not remove the temporary export file");
    }
  }
}

/** Storage list() is paged; collect every file in the user's photo folder. */
async function listPhotoPaths(userId: string): Promise<string[]> {
  const bucket = getSupabase().storage.from(PHOTO_BUCKET);
  const pageSize = 100;
  const paths: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await bucket.list(userId, { limit: pageSize, offset });
    if (error) throw error;
    paths.push(...data.map((item) => `${userId}/${item.name}`));
    if (data.length < pageSize) return paths;
  }
}

/**
 * Permanently deletes the account. Photos go first (Storage can't be cleared
 * from SQL); the database then refuses to continue if any file remains, so
 * a half-finished deletion can simply be retried.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  const db = getSupabase();
  const paths = await listPhotoPaths(userId);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }

  const { error } = await db.rpc("delete_my_account");
  if (error) throw error;
  logger.info("Account deleted");

  await clearLocalData({ userId, dropUnsyncedWorkouts: true });
  // The user no longer exists on the server, so only end the local session.
  const signOut = await db.auth.signOut({ scope: "local" });
  if (signOut.error)
    logger.warn("Local sign-out after deletion failed", { code: signOut.error.code });
}
