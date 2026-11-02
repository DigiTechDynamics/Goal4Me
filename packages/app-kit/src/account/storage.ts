/**
 * Storage buckets that hold account data. Progress photos are uploaded by
 * Goal4Me Fit, but deleting the account from either app must remove them
 * (the database refuses to delete an account while files remain).
 */
export const PHOTO_BUCKET = "progress-photos";
