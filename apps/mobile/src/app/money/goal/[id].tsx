import { monthlyContributionNeeded, parseMoneyInput } from "@goal4me/core";
import { savingsContributionSchema } from "@goal4me/schemas";
import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import {
  AppText,
  Banner,
  Button,
  Card,
  Screen,
  SegmentedControl,
  TextField,
} from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import {
  useAddContribution,
  useArchiveGoal,
  useSavingsGoals,
  type SavingsGoal,
} from "@/features/money/api";
import { Meter } from "@/features/money/components/Meter";
import { money } from "@/features/money/format";
import { toUserMessage } from "@/lib/errors";
import { formatDate, localToday } from "@/lib/format";
import { colors, spacing } from "@/theme/tokens";

/** One savings goal: progress, what to save each month, deposits and withdrawals. */
export default function GoalDetail() {
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals = useSavingsGoals(userId);

  if (goals.isPending) return <LoadingView />;
  if (goals.isError) {
    return <ErrorView message={toUserMessage(goals.error)} onRetry={() => void goals.refetch()} />;
  }
  const goal = goals.data.find((g) => g.id === id);
  if (!goal) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">Goal not found</AppText>
        <AppText color="textMuted">It may have been archived on another device.</AppText>
      </Screen>
    );
  }
  return <GoalView userId={userId} goal={goal} />;
}

function GoalView({ userId, goal }: { userId: string; goal: SavingsGoal }) {
  const add = useAddContribution(userId);
  const archive = useArchiveGoal(userId);
  const [kind, setKind] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | undefined>();
  const today = localToday();
  const progress = goal.targetMinor > 0 ? goal.savedMinor / goal.targetMinor : 0;
  const perMonth = goal.dueOn
    ? monthlyContributionNeeded({
        targetMinor: goal.targetMinor,
        savedMinor: goal.savedMinor,
        today,
        dueDate: goal.dueOn,
      })
    : null;

  const submit = () => {
    const minor = parseMoneyInput(amount);
    if (minor === null) {
      setError("Enter an amount, like 50");
      return;
    }
    if (kind === "withdraw" && minor > goal.savedMinor) {
      setError(`You can withdraw up to ${money(goal.savedMinor, goal.currency)}`);
      return;
    }
    const parsed = savingsContributionSchema.safeParse({
      id: randomUUID(),
      goalId: goal.id,
      amountMinor: kind === "deposit" ? minor : -minor,
      madeOn: today,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the amount");
      return;
    }
    setError(undefined);
    add.mutate(parsed.data, { onSuccess: () => setAmount("") });
  };

  const confirmArchive = () => {
    const run = () => archive.mutate(goal.id, { onSuccess: () => router.back() });
    const message = "It will be hidden from your goals. Your history is kept.";
    if (Platform.OS === "web") {
      if (window.confirm(`Archive ${goal.name}? ${message}`)) run();
      return;
    }
    Alert.alert(`Archive ${goal.name}?`, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: run },
    ]);
  };

  return (
    <Screen>
      <BackButton />
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          {goal.name}
        </AppText>
      </View>
      {goal.isEmergencyFund ? (
        <AppText variant="caption" color="success">
          Emergency fund · for real surprises only
        </AppText>
      ) : null}

      <Card>
        <AppText variant="display" color={progress >= 1 ? "success" : "text"}>
          {money(goal.savedMinor, goal.currency)}
        </AppText>
        <AppText color="textMuted">
          of {money(goal.targetMinor, goal.currency)} · {Math.min(100, Math.round(progress * 100))}%
        </AppText>
        <Meter value={Math.min(progress, 1)} color="success" />
        {progress >= 1 ? (
          <AppText variant="bodyStrong" color="success">
            Goal reached. Well done!
          </AppText>
        ) : perMonth !== null && goal.dueOn ? (
          <AppText variant="caption" color="textMuted">
            Save {money(perMonth, goal.currency)} a month to reach it by {formatDate(goal.dueOn)}.
          </AppText>
        ) : null}
      </Card>

      <Card>
        <SegmentedControl
          options={[
            { value: "deposit", label: "Add money" },
            { value: "withdraw", label: "Withdraw" },
          ]}
          value={kind}
          onChange={setKind}
          accessibilityLabel="Deposit or withdraw"
        />
        {add.isError ? <Banner message={toUserMessage(add.error)} /> : null}
        <TextField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          suffix={goal.currency}
          error={error}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Button
          label={kind === "deposit" ? "Add to goal" : "Withdraw"}
          loading={add.isPending}
          onPress={submit}
        />
      </Card>

      <AppText variant="overline" color="textMuted">
        History
      </AppText>
      {goal.contributions.length === 0 ? (
        <AppText color="textMuted">No money added yet. Even a small first amount counts.</AppText>
      ) : (
        <View>
          {goal.contributions.map((c) => (
            <View key={c.id} style={styles.row}>
              <AppText color="textMuted">{formatDate(c.madeOn)}</AppText>
              <AppText variant="bodyStrong" color={c.amountMinor > 0 ? "success" : "warning"}>
                {c.amountMinor > 0 ? "+" : ""}
                {money(c.amountMinor, goal.currency)}
              </AppText>
            </View>
          ))}
        </View>
      )}
      {archive.isError ? <Banner message={toUserMessage(archive.error)} /> : null}
      <Button
        label="Archive goal"
        variant="ghost"
        loading={archive.isPending}
        onPress={confirmArchive}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row" },
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
