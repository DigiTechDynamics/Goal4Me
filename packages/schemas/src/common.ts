import { parseIsoDate, SUPPORTED_CURRENCIES, type CurrencyCode } from "@goal4me/core";
import { z } from "zod";

/** A calendar date "YYYY-MM-DD" that actually exists (rejects 2026-02-30). */
export const isoDate = z.string().refine(
  (value) => {
    try {
      parseIsoDate(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Enter a valid date" },
);

/** UUIDs are generated on the device so offline writes can be retried safely. */
export const clientId = z.string().uuid();

/** Money in integer minor units (cents). */
export const minorAmount = z.number().int().nonnegative().max(1_000_000_000_00);

export const currency = z.enum(
  SUPPORTED_CURRENCIES as unknown as [CurrencyCode, ...CurrencyCode[]],
);
