import { activityStreak, monthStart, summariseBudget, daysLeftInMonth } from "@goal4me/core";
import { router } from "expo-router";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { NeedsPlan } from "@/features/home/NeedsPlan";
import {
  toCurrency,
  useBudgetMonth,
  useDeleteTransaction,
  useMoneyActivity,
  useSavingsGoals,
  type Transaction,
} from "@/features/money/api";
import { BudgetSetupCard } from "@/features/money/components/BudgetSetupCard";
import { Meter } from "@/features/money/components/Meter";
import { MoneyScoreCard } from "@/features/money/components/MoneyScoreCard";
import { BUCKET_LABEL, money, moneyWhole } from "@/features/money/format";
import { useIsPremium } from "@/features/billing/api";
import { openPaywall } from "@/features/billing/gating";
import { useLessons } from "@/features/money/lessons";
import { toUserMessage } from "@/lib/errors";
import { formatDate, localToday } from "@/lib/format";
import { colors, spacing } from "@/theme/tokens";

const RECENT_COUNT = 5;

/** Money tab: this month's budget, savings goals, lessons and money score. */
export default function Money() {
  const userId = useUserId();
  const today = localToday();
  const month = monthStart(today);
  const summary = useHomeSummary(userId);
  const budgetMonth = useBudgetMonth(userId, month);
  const goals = useSavingsGoals(userId);
  const lessons = useLessons(userId);
  const isPremium = useIsPremium(userId);
  const activity = useMoneyActivity(userId, today);
  const remove = useDeleteTransaction(userId);

  const queries = [summary, budgetMonth, goals];
  if (queries.some((q) => q.isPending)) return <LoadingView />;
  const failed = queries.find((q) => q.isError);
  if (failed || !summary.data || !budgetMonth.data || !goals.data) {
    return (
      <ErrorView
        message={toUserMessage(failed?.error)}
        onRetry={() => void Promise.all(queries.map((q) => q.refetch()))}
      />
    );
  }

  const { goal, profile } = summary.data;
  const { budget, categories, transactions, previousIncomeMinor } = budgetMonth.data;
  const currency = budget?.currency ?? toCurrency(profile.currency);
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}T00:00:00Z`),
  );

  if (!goal) {
    return (
      <Screen>
        <Header />
        <NeedsPlan />
      </Screen>
    );
  }

  if (!budget) {
    return (
      <Screen>
        <Header />
        <BudgetSetupCard
          userId={userId}
          currency={currency}
          initialIncomeMinor={previousIncomeMinor}
          title={`Set up your ${monthName} budget`}
        />
        <AppText variant="caption" color="textSubtle">
          Amounts are in {currency}. Goal4Me never connects to your bank: you stay in control of
          what you share.
        </AppText>
      </Screen>
    );
  }

  const netContributionsMinor = goals.data
    .flatMap((g) => g.contributions)
    .filter((c) => c.madeOn >= month)
    .reduce((sum, c) => sum + c.amountMinor, 0);
  const totals = summariseBudget({
    incomeMinor: budget.incomeMinor,
    categories,
    transactions,
    netContributionsMinor,
  });
  const needsTarget = totals.buckets[0]?.targetMinor ?? 0;
  const emergency = goals.data.find((g) => g.isEmergencyFund);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const lessonList = lessons.data ?? [];
  // Suggest the next lesson the user can open; a locked one only once the free ones are done.
  const todo = lessonList.filter((l) => !l.completed);
  const nextLesson = todo.find((l) => !l.isPremium || isPremium) ?? todo[0];
  const nextLocked = !!nextLesson && nextLesson.isPremium && !isPremium;

  const confirmDelete = (t: Transaction) => {
    const label = `${money(t.amountMinor, currency)} · ${categoryName.get(t.categoryId) ?? "Expense"}`;
    if (Platform.OS === "web") {
      if (window.confirm(`Delete ${label}?`)) remove.mutate(t.id);
      return;
    }
    Alert.alert("Delete this expense?", label, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(t.id) },
    ]);
  };

  return (
    <Screen>
      <Header onAdd={() => router.push("/money/expense")} />
      {remove.isError ? <Banner message={toUserMessage(remove.error)} /> : null}

      <Card>
        <AppText variant="overline" color="textMuted">
          {monthName}
        </AppText>
        <AppText variant="caption" color="textMuted">
          Left this month
        </AppText>
        <AppText variant="display" color={totals.leftMinor >= 0 ? "text" : "danger"}>
          {moneyWhole(totals.leftMinor, currency)}
        </AppText>
        <AppText variant="caption" color="textSubtle">
          of {money(budget.incomeMinor, currency)} income · {daysLeftInMonth(today)} days to go
        </AppText>
        <View style={styles.buckets}>
          {totals.buckets.map((b) => (
            <View key={b.bucket} style={styles.bucket}>
              <View style={styles.rowBetween}>
                <AppText variant="caption" color="textMuted">
                  {BUCKET_LABEL[b.bucket]}
                </AppText>
                <AppText variant="caption" color="textSubtle">
                  {money(b.actualMinor, currency)} / {money(b.targetMinor, currency)}
                </AppText>
              </View>
              <Meter
                value={b.targetMinor > 0 ? b.actualMinor / b.targetMinor : 0}
                color={b.bucket === "savings" ? "success" : "brand"}
              />
            </View>
          ))}
        </View>
        <Button
          label="Change income"
          variant="ghost"
          onPress={() => router.push("/money/income")}
        />
      </Card>

      <MoneyScoreCard
        input={{
          savingsRate: totals.savingsRate,
          emergencyFundMonths:
            emergency && needsTarget > 0 ? emergency.savedMinor / needsTarget : 0,
          lessonsCompleted: lessonList.filter((l) => l.completed).length,
          totalLessons: lessonList.length,
          budgetStreakDays: activityStreak(activity.data ?? [], today),
        }}
      />

      <SectionTitle title="Categories" />
      <Card>
        {totals.categories.map((c, i) => (
          <Pressable
            key={c.id}
            onPress={() => router.push({ pathname: "/money/category", params: { id: c.id } })}
            style={[styles.category, i > 0 && styles.divider]}
            accessibilityRole="button"
            accessibilityHint="Edit this category"
          >
            <View style={styles.rowBetween}>
              <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {c.name}
              </AppText>
              <AppText
                variant="caption"
                color={c.remainingMinor !== null && c.remainingMinor < 0 ? "danger" : "textMuted"}
              >
                {money(c.spentMinor, currency)}
                {c.limitMinor !== null ? ` / ${money(c.limitMinor, currency)}` : ""}
              </AppText>
            </View>
            {c.usage !== null ? <Meter value={c.usage} /> : null}
          </Pressable>
        ))}
        <Button
          label="Add category"
          variant="ghost"
          onPress={() => router.push("/money/category")}
        />
      </Card>

      <SectionTitle title="Recent expenses" />
      {transactions.length === 0 ? (
        <AppText color="textMuted">
          Nothing logged this month yet. Tap Add expense each time you spend; it takes 5 seconds.
        </AppText>
      ) : (
        <View>
          {transactions.slice(0, RECENT_COUNT).map((t) => (
            <Pressable
              key={t.id}
              style={styles.txn}
              onLongPress={() => confirmDelete(t)}
              onPress={() => confirmDelete(t)}
              accessibilityRole="button"
              accessibilityHint="Delete this expense"
            >
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {t.note || categoryName.get(t.categoryId) || "Expense"}
                </AppText>
                <AppText variant="caption" color="textSubtle">
                  {t.note ? `${categoryName.get(t.categoryId) ?? "Archived category"} · ` : ""}
                  {formatDate(t.occurredOn)}
                </AppText>
              </View>
              <AppText variant="bodyStrong">{money(t.amountMinor, currency)}</AppText>
            </Pressable>
          ))}
        </View>
      )}

      <SectionTitle title="Savings goals" />
      {goals.data.map((g) => (
        <Pressable
          key={g.id}
          onPress={() => router.push({ pathname: "/money/goal/[id]", params: { id: g.id } })}
          accessibilityRole="button"
        >
          <Card>
            <View style={styles.rowBetween}>
              <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {g.name}
              </AppText>
              {g.isEmergencyFund && g.name.toLowerCase() !== "emergency fund" ? (
                <AppText variant="caption" color="success">
                  Emergency fund
                </AppText>
              ) : null}
            </View>
            <Meter value={g.targetMinor > 0 ? g.savedMinor / g.targetMinor : 0} color="success" />
            <AppText variant="caption" color="textMuted">
              {money(g.savedMinor, g.currency)} of {money(g.targetMinor, g.currency)}
              {g.dueOn ? ` · by ${formatDate(g.dueOn)}` : ""}
            </AppText>
          </Card>
        </Pressable>
      ))}
      <Button
        label={goals.data.length ? "New savings goal" : "Create your first savings goal"}
        variant="secondary"
        onPress={() => router.push("/money/goal-new")}
      />

      <SectionTitle title="Learn" />
      <Card>
        <AppText variant="caption" color="textMuted">
          {lessonList.filter((l) => l.completed).length} of {lessonList.length} lessons done
        </AppText>
        <AppText variant="heading">
          {nextLesson ? nextLesson.title : "You've finished every lesson"}
        </AppText>
        {nextLesson ? (
          <Button
            label={nextLocked ? "Unlock all 30 lessons" : "Start 3-minute lesson"}
            onPress={() =>
              nextLocked
                ? openPaywall("lesson")
                : router.push({ pathname: "/money/lesson/[id]", params: { id: nextLesson.id } })
            }
          />
        ) : null}
        <Button label="All lessons" variant="ghost" onPress={() => router.push("/money/lessons")} />
      </Card>

      <AppText variant="caption" color="textSubtle">
        Goal4Me offers general financial education, not personal financial advice.
      </AppText>
    </Screen>
  );
}

function Header({ onAdd }: { onAdd?: () => void }) {
  return (
    <View style={styles.header}>
      <AppText variant="title" accessibilityRole="header" style={styles.flex}>
        Money
      </AppText>
      {onAdd ? <Button label="Add expense" onPress={onAdd} style={styles.headerButton} /> : null}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <AppText variant="overline" color="textMuted" style={styles.section}>
      {title}
    </AppText>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingTop: spacing.md, gap: spacing.md },
  headerButton: { minHeight: 44, paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
  section: { paddingTop: spacing.sm },
  buckets: { gap: spacing.md, paddingTop: spacing.sm },
  bucket: { gap: spacing.xs },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  category: { gap: spacing.sm, paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
