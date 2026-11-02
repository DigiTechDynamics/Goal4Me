import { formatMoney, type CurrencyCode } from "@goal4me/core";

/** Money for display, e.g. "$1,234.50" or "ZAR 1,234.50", with a true minus sign. */
export function money(minor: number, currency: CurrencyCode): string {
  return formatMoney(minor, currency, "en").replace("-", "−");
}

/** Whole units only, for big headline numbers ("$1,235"). */
export function moneyWhole(minor: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(Math.round(minor / 100))
    .replace("-", "−");
}

export const BUCKET_LABEL = { needs: "Needs", wants: "Wants", savings: "Savings" } as const;
