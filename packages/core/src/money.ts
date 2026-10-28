import type { CurrencyCode } from "./constants";
import { monthsUntil, type IsoDate } from "./dates";

/**
 * Money is always handled as integer minor units (cents) to avoid floating
 * point errors: 0.1 + 0.2 !== 0.3, but 10 + 20 === 30.
 * Every launch currency uses 2 decimal places.
 */
const MINOR_UNITS_PER_MAJOR = 100;

export function toMinor(amount: number): number {
  if (!Number.isFinite(amount)) throw new RangeError("Amount must be a finite number");
  return Math.round(amount * MINOR_UNITS_PER_MAJOR);
}

export const fromMinor = (minor: number): number => minor / MINOR_UNITS_PER_MAJOR;

/** Formats minor units for display, e.g. formatMoney(123456, "ZAR", "en-ZA") → "R 1 234,56". */
export function formatMoney(minor: number, currency: CurrencyCode, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(fromMinor(minor));
}

export interface BudgetSplit {
  needsMinor: number;
  wantsMinor: number;
  savingsMinor: number;
}

/**
 * The 50/30/20 rule: 50 % needs, 30 % wants, 20 % savings. Any rounding
 * remainder goes to needs so the three parts always add up to the income.
 */
export function split503020(incomeMinor: number): BudgetSplit {
  if (!Number.isInteger(incomeMinor) || incomeMinor < 0) {
    throw new RangeError("Income must be a non-negative integer of minor units");
  }
  const wantsMinor = Math.floor(incomeMinor * 0.3);
  const savingsMinor = Math.floor(incomeMinor * 0.2);
  return { needsMinor: incomeMinor - wantsMinor - savingsMinor, wantsMinor, savingsMinor };
}

/** Emergency fund target: 3 months of essential expenses. */
export const EMERGENCY_FUND_MONTHS = 3;
export const emergencyFundTarget = (monthlyExpensesMinor: number): number =>
  monthlyExpensesMinor * EMERGENCY_FUND_MONTHS;

/**
 * How much to save each month to reach a goal by its due date (rounded up to
 * the next whole unit so the user doesn't fall a few cents short). Returns
 * the whole remaining amount if the due date is this month or already past.
 */
export function monthlyContributionNeeded(input: {
  targetMinor: number;
  savedMinor: number;
  today: IsoDate;
  dueDate: IsoDate;
}): number {
  const remaining = Math.max(0, input.targetMinor - input.savedMinor);
  if (remaining === 0) return 0;
  const months = Math.max(1, monthsUntil(input.today, input.dueDate));
  return Math.ceil(remaining / months / MINOR_UNITS_PER_MAJOR) * MINOR_UNITS_PER_MAJOR;
}

export interface MoneyScoreInput {
  /** Fraction of income saved this month, e.g. 0.15 for 15 %. */
  savingsRate: number;
  /** Emergency savings divided by monthly expenses. */
  emergencyFundMonths: number;
  lessonsCompleted: number;
  totalLessons: number;
  /** Consecutive days with the budget checked or an expense logged. */
  budgetStreakDays: number;
}

export interface MoneyScore {
  score: number;
  breakdown: { savings: number; emergencyFund: number; learning: number; habits: number };
}

/** Weights for each part of the money score (they add up to 100). */
const SCORE_WEIGHTS = { savings: 35, emergencyFund: 30, learning: 20, habits: 15 } as const;
/** The value at which each part earns full marks. */
const FULL_MARKS = { savingsRate: 0.2, emergencyFundMonths: 3, budgetStreakDays: 30 } as const;

const fraction = (value: number, full: number): number =>
  full <= 0 ? 0 : Math.min(1, Math.max(0, value / full));

/** Money score 0–100: where the user stands financially and which part to work on next. */
export function moneyScore(input: MoneyScoreInput): MoneyScore {
  const breakdown = {
    savings: Math.round(
      SCORE_WEIGHTS.savings * fraction(input.savingsRate, FULL_MARKS.savingsRate),
    ),
    emergencyFund: Math.round(
      SCORE_WEIGHTS.emergencyFund *
        fraction(input.emergencyFundMonths, FULL_MARKS.emergencyFundMonths),
    ),
    learning: Math.round(
      SCORE_WEIGHTS.learning * fraction(input.lessonsCompleted, input.totalLessons),
    ),
    habits: Math.round(
      SCORE_WEIGHTS.habits * fraction(input.budgetStreakDays, FULL_MARKS.budgetStreakDays),
    ),
  };
  const score = breakdown.savings + breakdown.emergencyFund + breakdown.learning + breakdown.habits;
  return { score, breakdown };
}

/**
 * Parses what a user typed into an amount field, accepting both "1,234.50"
 * and "1 234,50" (South African style). Returns minor units, or null when
 * the text isn't a positive amount with at most two decimals.
 */
export function parseMoneyInput(text: string): number | null {
  // \s also matches non-breaking spaces, which some keyboards insert in "1 234".
  const compact = text.replace(/[\s']/g, "");
  if (compact === "" || !/^[\d.,]+$/.test(compact)) return null;
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);
  let normalised: string;
  if (
    decimalAt !== -1 &&
    compact.length - decimalAt - 1 <= 2 &&
    compact.length - decimalAt - 1 > 0
  ) {
    // The last separator followed by 1–2 digits is the decimal point.
    normalised = `${compact.slice(0, decimalAt).replace(/[.,]/g, "")}.${compact.slice(decimalAt + 1)}`;
  } else {
    // Otherwise every separator groups thousands ("1,000" or "1.000.000").
    normalised = compact.replace(/[.,]/g, "");
  }
  const value = Number(normalised);
  if (!Number.isFinite(value) || value <= 0) return null;
  return toMinor(value);
}
