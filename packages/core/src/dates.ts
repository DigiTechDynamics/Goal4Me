/**
 * Date helpers that work on calendar dates ("YYYY-MM-DD") in UTC, so results
 * never shift by a day because of the device's time zone.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export type IsoDate = string;

export function parseIsoDate(value: IsoDate): Date {
  if (!ISO_DATE.test(value)) throw new TypeError(`Expected YYYY-MM-DD, got "${value}"`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`Invalid calendar date "${value}"`);
  }
  return date;
}

export const toIsoDate = (date: Date): IsoDate => date.toISOString().slice(0, 10);

export function addDays(value: IsoDate, days: number): IsoDate {
  return toIsoDate(new Date(parseIsoDate(value).getTime() + days * MS_PER_DAY));
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / MS_PER_DAY);
}

/**
 * Whole calendar months from `from` to `to`, counting a partial month as a
 * full one (used for "save X per month"). Returns 0 when `to` is not after `from`.
 */
export function monthsUntil(from: IsoDate, to: IsoDate): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (b <= a) return 0;
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  return b.getUTCDate() > a.getUTCDate() ? months + 1 : Math.max(months, 1);
}
