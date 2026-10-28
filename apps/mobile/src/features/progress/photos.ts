import {
  progressPhotoSchema,
  type PHOTO_MIME_TYPES,
  type PhotoPose,
  type ProgressPhotoInput,
} from "@goal4me/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";

/**
 * Progress photos live in the private "progress-photos" bucket under
 * <user_id>/<photo_id>.<ext>. Storage policies and a CHECK constraint keep
 * every user inside their own folder; images are only ever shown through
 * short-lived signed URLs.
 */
export const PHOTO_BUCKET = "progress-photos";
const SIGNED_URL_TTL_S = 60 * 60;

export interface ProgressPhoto {
  id: string;
  takenOn: string;
  pose: PhotoPose;
  storagePath: string;
  /** Null when the file could not be signed (e.g. it was removed). */
  url: string | null;
}

export const photoKeys = { all: (userId: string) => ["progress-photos", userId] as const };

async function fetchPhotos(userId: string): Promise<ProgressPhoto[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from("progress_photos")
    .select("id, taken_on, pose, storage_path")
    .eq("user_id", userId)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // One request signs every path, instead of one round trip per photo.
  const signed = await db.storage.from(PHOTO_BUCKET).createSignedUrls(
    rows.map((row) => row.storage_path),
    SIGNED_URL_TTL_S,
  );
  if (signed.error) throw signed.error;
  const urlByPath = new Map(signed.data.map((item) => [item.path, item.signedUrl]));

  return rows.map((row) => ({
    id: row.id,
    takenOn: row.taken_on,
    pose: row.pose as PhotoPose,
    storagePath: row.storage_path,
    url: urlByPath.get(row.storage_path) ?? null,
  }));
}

export function useProgressPhotos(userId: string) {
  return useQuery({
    queryKey: photoKeys.all(userId),
    queryFn: () => fetchPhotos(userId),
    // Refresh well before the signed URLs expire; never persist them to disk.
    staleTime: (SIGNED_URL_TTL_S - 10 * 60) * 1000,
    meta: { persist: false },
  });
}

const EXTENSION: Record<(typeof PHOTO_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/** Picker results don't always include a MIME type; fall back to the file name. */
export function guessMimeType(uri: string, reported?: string | null): string {
  if (reported) return reported.toLowerCase();
  const ext = uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  // On the web the picker returns a blob: URL; natively a file:// path.
  if (Platform.OS === "web") return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

export interface NewPhoto {
  uri: string;
  mimeType?: string | null | undefined;
  pose: PhotoPose;
  takenOn: string;
}

export class PhotoValidationError extends Error {}

export function useUploadPhoto(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (photo: NewPhoto) => {
      const bytes = await readBytes(photo.uri);
      const parsed = progressPhotoSchema.safeParse({
        id: randomUUID(),
        takenOn: photo.takenOn,
        pose: photo.pose,
        mimeType: guessMimeType(photo.uri, photo.mimeType),
        sizeBytes: bytes.byteLength,
      } satisfies Record<keyof ProgressPhotoInput, unknown>);
      if (!parsed.success) {
        throw new PhotoValidationError(parsed.error.issues[0]?.message ?? "Invalid photo");
      }
      const input = parsed.data;
      const path = `${userId}/${input.id}.${EXTENSION[input.mimeType]}`;

      const db = getSupabase();
      const upload = await db.storage
        .from(PHOTO_BUCKET)
        .upload(path, bytes, { contentType: input.mimeType, upsert: false });
      if (upload.error) throw upload.error;

      const insert = await db.from("progress_photos").insert({
        id: input.id,
        user_id: userId,
        taken_on: input.takenOn,
        pose: input.pose,
        storage_path: path,
      });
      if (insert.error) {
        // Compensate: don't leave a file without a row (it would block account deletion).
        const cleanup = await db.storage.from(PHOTO_BUCKET).remove([path]);
        if (cleanup.error) logger.warn("Orphaned progress photo", { path });
        throw insert.error;
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: photoKeys.all(userId) }),
  });
}

export function useDeletePhoto(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (photo: Pick<ProgressPhoto, "id" | "storagePath">) => {
      const db = getSupabase();
      // File first: a row without a file only shows a gap; a file without a
      // row would be invisible personal data.
      const removed = await db.storage.from(PHOTO_BUCKET).remove([photo.storagePath]);
      if (removed.error) throw removed.error;
      const { error } = await db.from("progress_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: photoKeys.all(userId) }),
  });
}
