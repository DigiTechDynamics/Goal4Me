import { addDays, daysBetween, type IsoDate } from "./dates";
import { split503020 } from "./money";

/**
 * Budget maths for the Money tab. All amounts are integer minor units.
 */
export type BudgetBucket = "needs" | "wants" | "savings";
export const BUDGET_BUCKETS: readonly BudgetBucket[] = ["needs", "wants", "savings"];

/** First day of the month containing `date`. */
export const monthStart = (date: IsoDate): IsoDate => `${date.slice(0, 7)}-01`;

/** First day of the following month (exclusive end for range queries). */
export function nextMonthStart(date: IsoDate): IsoDate {
  const [y, m] = date.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export interface BudgetCategoryInput {
  id: string;
  name: string;
  bucket: BudgetBucket;
  limitMinor: number | null;
}

export interface CategorySummary extends BudgetCategoryInput {
  spentMinor: number;
  /** Null when the category has no limit. Negative when over budget. */
  remainingMinor: number | null;
  /** Share of the limit used, 0–∞; null without a limit. */
  usage: number | null;
}

export interface BucketSummary {
  bucket: BudgetBucket;
  targetMinor: number;
  actualMinor: number;
}

export interface BudgetSummary {
  categories: CategorySummary[];
  buckets: BucketSummary[];
  /** Spending in needs and wants (savings are not "spent"). */
  spentMinor: number;
  /** Income minus spending minus money put into savings. */
  leftMinor: number;
  /** Net money saved this month as a share of income (0 when no income). */
  savingsRate: number;
}

/**
 * Totals the month's transactions per category and per 50/30/20 bucket.
 * Savings = savings-bucket transactions + net contributions to savings goals.
 */
export function summariseBudget(input: {
  incomeMinor: number;
  categories: readonly BudgetCategoryInput[];
  transactions: readonly { categoryId: string; amountMinor: number }[];
  netContributionsMinor: number;
}): BudgetSummary {
  const spentByCategory = new Map<string, number>();
  for (const t of input.transactions) {
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amountMinor);
  }

  const categories = input.categories.map((category) => {
    const spentMinor = spentByCategory.get(category.id) ?? 0;
    const limit = category.limitMinor;
    return {
      ...category,
      spentMinor,
      remainingMinor: limit === null ? null : limit - spentMinor,
      usage:
        limit === null ? null : limit === 0 ? (spentMinor > 0 ? Infinity : 0) : spentMinor / limit,
    };
  });

  const targets = split503020(input.incomeMinor);
  const actual = { needs: 0, wants: 0, savings: Math.max(0, input.netContributionsMinor) };
  for (const c of categories) actual[c.bucket] += c.spentMinor;

  const buckets: BucketSummary[] = [
    { bucket: "needs", targetMinor: targets.needsMinor, actualMinor: actual.needs },
    { bucket: "wants", targetMinor: targets.wantsMinor, actualMinor: actual.wants },
    { bucket: "savings", targetMinor: targets.savingsMinor, actualMinor: actual.savings },
  ];
  const spentMinor = actual.needs + actual.wants;
  return {
    categories,
    buckets,
    spentMinor,
    leftMinor: input.incomeMinor - spentMinor - actual.savings,
    savingsRate: input.incomeMinor > 0 ? actual.savings / input.incomeMinor : 0,
  };
}

/**
 * Days in a row (ending today, or yesterday if nothing is logged yet today)
 * on which the user logged at least one expense or contribution.
 */
export function activityStreak(dates: readonly IsoDate[], today: IsoDate): number {
  const days = new Set(dates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Whole days left in the month, counting today. */
export const daysLeftInMonth = (today: IsoDate): number =>
  daysBetween(today, nextMonthStart(today));
