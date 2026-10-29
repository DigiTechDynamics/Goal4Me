import { addDays, monthStart, parseMoneyInput } from "@goal4me/core";
import { transactionSchema } from "@goal4me/schemas";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Screen, SegmentedControl, TextField } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useAddTransaction, useBudgetMonth } from "@/features/money/api";
import { BUCKET_LABEL } from "@/features/money/format";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";
import { colors, radii, spacing } from "@/theme/tokens";

/** Quick expense entry: amount, category, day and an optional note. */
export default function AddExpense() {
  const userId = useUserId();
  const today = localToday();
  const month = useBudgetMonth(userId, monthStart(today));
  const save = useAddTransaction(userId);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [day, setDay] = useState<"today" | "yesterday">("today");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({});
  // A stable id per screen visit: double-tapping Save can't create two expenses.
  const [id] = useState(() => randomUUID());

  if (month.isPending) return <LoadingView />;
  if (month.isError) {
    return <ErrorView message={toUserMessage(month.error)} onRetry={() => void month.refetch()} />;
  }
  const { budget, categories } = month.data;
  if (!budget) {
    return (
      <Screen>
        <BackButton variant="close" />
        <AppText variant="title">Set up your budget first</AppText>
        <AppText color="textMuted">
          Add this month's income on the Money tab, then log expenses.
        </AppText>
      </Screen>
    );
  }

  // Yesterday may fall in last month; the budget for that month still records it.
  const occurredOn = day === "today" ? today : addDays(today, -1);

  const submit = () => {
    const amountMinor = parseMoneyInput(amount);
    const next: typeof errors = {};
    if (amountMinor === null) next.amount = "Enter an amount, like 12.50";
    if (!categoryId) next.category = "Choose a category";
    setErrors(next);
    if (amountMinor === null || !categoryId) return;

    const parsed = transactionSchema.safeParse({
      id,
      occurredOn,
      amountMinor,
      currency: budget.currency,
      categoryId,
      note: note.trim() || undefined,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setErrors(
        issue?.path[0] === "categoryId"
          ? { category: "Choose a category again" }
          : issue?.path[0] === "amountMinor"
            ? { amount: issue.message }
            : { amount: "Check the amount and try again" },
      );
      return;
    }
    save.mutate(parsed.data, { onSuccess: () => router.back() });
  };

  return (
    <Screen footer={<Button label="Save expense" loading={save.isPending} onPress={submit} />}>
      <BackButton variant="close" />
      <AppText variant="title" accessibilityRole="header">
        Add expense
      </AppText>
      {save.isError ? <Banner message={toUserMessage(save.error)} /> : null}
      <TextField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        suffix={budget.currency}
        error={errors.amount}
        autoFocus
      />
      <SegmentedControl
        options={[
          { value: "today", label: "Today" },
          { value: "yesterday", label: "Yesterday" },
        ]}
        value={day}
        onChange={setDay}
        accessibilityLabel="Day"
      />
      {(["needs", "wants", "savings"] as const).map((bucket) => {
        const inBucket = categories.filter((c) => c.bucket === bucket);
        if (inBucket.length === 0) return null;
        return (
          <View key={bucket} style={styles.group}>
            <AppText variant="overline" color="textMuted">
              {BUCKET_LABEL[bucket]}
            </AppText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {inBucket.map((c) => {
                const selected = c.id === categoryId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <AppText variant="caption" color={selected ? "onBrand" : "text"}>
                      {c.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {errors.category ? (
        <AppText variant="caption" color="danger">
          {errors.category}
        </AppText>
      ) : null}
      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={140}
        placeholder="e.g. Bus to work"
        placeholderTextColor={colors.textSubtle}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
});
