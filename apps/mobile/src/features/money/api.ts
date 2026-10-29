import {
  addDays,
  nextMonthStart,
  SUPPORTED_CURRENCIES,
  type BudgetBucket,
  type CurrencyCode,
} from "@goal4me/core";
import type {
  BudgetCategoryInput,
  BudgetSetupInput,
  SavingsContributionInput,
  SavingsGoalInput,
  TransactionInput,
} from "@goal4me/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

/**
 * Data access for the Money tab. Amounts arrive from Postgres as bigint,
 * which PostgREST serialises as a JSON number (safe below 2^53, far above
 * any realistic personal amount); we still normalise with Number().
 */
export const moneyKeys = {
  all: (userId: string) => ["money", userId] as const,
  month: (userId: string, month: string) => ["money", userId, "month", month] as const,
  goals: (userId: string) => ["money", userId, "goals"] as const,
  activity: (userId: string) => ["money", userId, "activity"] as const,
  lessons: (userId: string) => ["money", userId, "lessons"] as const,
  lesson: (lessonId: string) => ["lesson", lessonId] as const,
};

/** Profile currency, falling back to USD for unexpected values. */
export function toCurrency(value: string | null | undefined): CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value ?? "")
    ? (value as CurrencyCode)
    : "USD";
}

// ----------------------------------------------------------------- Budget

export interface Category {
  id: string;
  name: string;
  bucket: BudgetBucket;
  limitMinor: number | null;
}

export interface Transaction {
  id: string;
  occurredOn: string;
  amountMinor: number;
  categoryId: string;
  note: string | null;
}

export interface BudgetMonth {
  budget: { id: string; incomeMinor: number; currency: CurrencyCode } | null;
  /** Income of the latest earlier budget, to prefill a new month. */
  previousIncomeMinor: number | null;
  categories: Category[];
  transactions: Transaction[];
}

async function fetchMonth(userId: string, month: string): Promise<BudgetMonth> {
  const db = getSupabase();
  const [budget, previous, categories, transactions] = await Promise.all([
    db
      .from("budgets")
      .select("id, income_minor, currency")
      .eq("user_id", userId)
      .eq("month", month)
      .maybeSingle(),
    db
      .from("budgets")
      .select("income_minor")
      .eq("user_id", userId)
      .lt("month", month)
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("budget_categories")
      .select("id, name, bucket, monthly_limit_minor")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("created_at"),
    db
      .from("transactions")
      .select("id, occurred_on, amount_minor, category_id, note")
      .eq("user_id", userId)
      .gte("occurred_on", month)
      .lt("occurred_on", nextMonthStart(month))
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  const error = budget.error ?? previous.error ?? categories.error ?? transactions.error;
  if (error) throw error;

  return {
    budget: budget.data
      ? {
          id: budget.data.id,
          incomeMinor: Number(budget.data.income_minor),
          currency: toCurrency(budget.data.currency),
        }
      : null,
    previousIncomeMinor: previous.data ? Number(previous.data.income_minor) : null,
    categories: (categories.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      bucket: row.bucket as BudgetBucket,
      limitMinor: row.monthly_limit_minor === null ? null : Number(row.monthly_limit_minor),
    })),
    transactions: (transactions.data ?? []).map((row) => ({
      id: row.id,
      occurredOn: row.occurred_on,
      amountMinor: Number(row.amount_minor),
      categoryId: row.category_id,
      note: row.note,
    })),
  };
}

export function useBudgetMonth(userId: string, month: string) {
  return useQuery({
    queryKey: moneyKeys.month(userId, month),
    queryFn: () => fetchMonth(userId, month),
  });
}

/** Every money write can change totals, the score and the streak: refresh all money queries. */
function useInvalidateMoney(userId: string) {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: moneyKeys.all(userId) });
}

export function useSetupBudget(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async (input: BudgetSetupInput) => {
      const { error } = await getSupabase().rpc("setup_budget", {
        p_month: input.month,
        p_income_minor: input.incomeMinor,
        p_currency: input.currency,
      });
      if (error) throw error;
      track("budget_created", {});
    },
    onSuccess: invalidate,
  });
}

export function useAddTransaction(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      // Upsert on the device-generated id makes a retried save harmless.
      const { error } = await getSupabase()
        .from("transactions")
        .upsert(
          {
            id: input.id,
            user_id: userId,
            occurred_on: input.occurredOn,
            amount_minor: input.amountMinor,
            currency: input.currency,
            category_id: input.categoryId,
            note: input.note ?? null,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveCategory(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async ({ id, input }: { id: string | null; input: BudgetCategoryInput }) => {
      const row = {
        name: input.name,
        bucket: input.bucket,
        monthly_limit_minor: input.limitMinor,
        updated_at: new Date().toISOString(),
      };
      const db = getSupabase().from("budget_categories");
      const { error } = id
        ? await db.update(row).eq("id", id)
        : await db.insert({ ...row, user_id: userId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Categories are archived, never deleted, so past transactions keep their
 * category (the foreign key is ON DELETE RESTRICT).
 */
export function useArchiveCategory(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase()
        .from("budget_categories")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ----------------------------------------------------------- Savings goals

export interface Contribution {
  id: string;
  amountMinor: number;
  madeOn: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetMinor: number;
  currency: CurrencyCode;
  dueOn: string | null;
  isEmergencyFund: boolean;
  savedMinor: number;
  /** Newest first. */
  contributions: Contribution[];
}

async function fetchGoals(userId: string): Promise<SavingsGoal[]> {
  const db = getSupabase();
  const [goals, contributions] = await Promise.all([
    db
      .from("savings_goals")
      .select("id, name, target_minor, currency, due_on, is_emergency_fund")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("is_emergency_fund", { ascending: false })
      .order("created_at"),
    db
      .from("savings_contributions")
      .select("id, goal_id, amount_minor, made_on")
      .eq("user_id", userId)
      .order("made_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (goals.error) throw goals.error;
  if (contributions.error) throw contributions.error;

  const byGoal = new Map<string, Contribution[]>();
  for (const row of contributions.data ?? []) {
    const list = byGoal.get(row.goal_id) ?? [];
    list.push({ id: row.id, amountMinor: Number(row.amount_minor), madeOn: row.made_on });
    byGoal.set(row.goal_id, list);
  }
  return (goals.data ?? []).map((row) => {
    const list = byGoal.get(row.id) ?? [];
    return {
      id: row.id,
      name: row.name,
      targetMinor: Number(row.target_minor),
      currency: toCurrency(row.currency),
      dueOn: row.due_on,
      isEmergencyFund: row.is_emergency_fund,
      savedMinor: list.reduce((sum, c) => sum + c.amountMinor, 0),
      contributions: list,
    };
  });
}

export function useSavingsGoals(userId: string) {
  return useQuery({ queryKey: moneyKeys.goals(userId), queryFn: () => fetchGoals(userId) });
}

export function useCreateGoal(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async (input: SavingsGoalInput) => {
      const { error } = await getSupabase()
        .from("savings_goals")
        .upsert(
          {
            id: input.id,
            user_id: userId,
            name: input.name,
            target_minor: input.targetMinor,
            currency: input.currency,
            due_on: input.dueOn ?? null,
            is_emergency_fund: input.isEmergencyFund,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useArchiveGoal(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase()
        .from("savings_goals")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useAddContribution(userId: string) {
  const invalidate = useInvalidateMoney(userId);
  return useMutation({
    mutationFn: async (input: SavingsContributionInput) => {
      const { error } = await getSupabase().from("savings_contributions").upsert(
        {
          id: input.id,
          goal_id: input.goalId,
          user_id: userId,
          amount_minor: input.amountMinor,
          made_on: input.madeOn,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- Activity

/** Dates with money activity in the last 60 days, for the budgeting streak. */
export function useMoneyActivity(userId: string, today: string) {
  return useQuery({
    queryKey: [...moneyKeys.activity(userId), today],
    queryFn: async () => {
      const since = addDays(today, -60);
      const db = getSupabase();
      const [transactions, contributions] = await Promise.all([
        db
          .from("transactions")
          .select("occurred_on")
          .eq("user_id", userId)
          .gte("occurred_on", since),
        db
          .from("savings_contributions")
          .select("made_on")
          .eq("user_id", userId)
          .gte("made_on", since),
      ]);
      if (transactions.error) throw transactions.error;
      if (contributions.error) throw contributions.error;
      return [
        ...(transactions.data ?? []).map((row) => row.occurred_on),
        ...(contributions.data ?? []).map((row) => row.made_on),
      ];
    },
  });
}
