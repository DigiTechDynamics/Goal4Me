import { MONEY_GOALS } from "@goal4me/schemas";
import { StyleSheet } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { NeedsPlan } from "@/features/home/NeedsPlan";
import { toUserMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";

const MONEY_GOAL_LABEL: Record<(typeof MONEY_GOALS)[number], string> = {
  build_emergency_fund: "Build an emergency fund",
  pay_off_debt: "Pay off debt",
  save_for_purchase: "Save for something big",
  start_investing: "Start investing",
  budget_better: "Budget better",
};

const isMoneyGoal = (value: string | null): value is (typeof MONEY_GOALS)[number] =>
  value !== null && (MONEY_GOALS as readonly string[]).includes(value);

/** Money tab: the user's money goal and currency; budgeting tools follow in stage 5. */
export default function Money() {
  const userId = useUserId();
  const summary = useHomeSummary(userId);

  if (summary.isPending) return <LoadingView />;
  if (summary.isError) {
    return (
      <ErrorView message={toUserMessage(summary.error)} onRetry={() => void summary.refetch()} />
    );
  }
  const { goal, profile } = summary.data;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Money
      </AppText>
      {!goal ? (
        <NeedsPlan />
      ) : (
        <Card>
          <AppText variant="overline" color="brand">
            Your money goal
          </AppText>
          <AppText variant="heading">
            {isMoneyGoal(goal.moneyGoal) ? MONEY_GOAL_LABEL[goal.moneyGoal] : "Not set yet"}
          </AppText>
          <AppText color="textMuted">
            Amounts will be shown in {profile.currency ?? "your currency"}.
          </AppText>
          <AppText variant="caption" color="textSubtle">
            Budgets, savings goals and 3-minute money lessons are coming in an upcoming update.
          </AppText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { paddingTop: spacing.md } });
