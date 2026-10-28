/**
 * Premium plans sold on the web through PayNow (USD). Must match PLAN_IDS in
 * packages/schemas/src/billing.ts and the store products in RevenueCat.
 * Prices are the approved launch prices (spec: Monetisation).
 */
export type PlanId = "premium_weekly" | "premium_quarterly" | "premium_yearly";

export interface Plan {
  id: PlanId;
  label: string;
  /** Price in US cents. */
  amountMinor: number;
  /** Length of one paid period. */
  period: { days: number } | { months: number };
}

export const PLANS: Record<PlanId, Plan> = {
  premium_weekly: {
    id: "premium_weekly",
    label: "Goal4Me Premium (1 week)",
    amountMinor: 699,
    period: { days: 7 },
  },
  premium_quarterly: {
    id: "premium_quarterly",
    label: "Goal4Me Premium (3 months)",
    amountMinor: 2999,
    period: { months: 3 },
  },
  premium_yearly: {
    id: "premium_yearly",
    label: "Goal4Me Premium (1 year)",
    amountMinor: 5999,
    period: { months: 12 },
  },
};

export const isPlanId = (value: unknown): value is PlanId =>
  typeof value === "string" && value in PLANS;

/** End of a paid period that starts at `from` (UTC, month-end safe). */
export function addPeriod(from: Date, period: Plan["period"]): Date {
  const end = new Date(from.getTime());
  if ("days" in period) {
    end.setUTCDate(end.getUTCDate() + period.days);
    return end;
  }
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + period.months);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}
