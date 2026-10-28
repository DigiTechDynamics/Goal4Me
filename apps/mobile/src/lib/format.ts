import { parseIsoDate } from "@goal4me/core";

/** "30 Apr 2027" for a calendar date, independent of the device time zone. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(iso));
}

/** "27 Jan 2027" for a moment in time (e.g. a subscription expiry), in the device's time zone. */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);

/** Today's date (YYYY-MM-DD) in the device's local time zone. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
