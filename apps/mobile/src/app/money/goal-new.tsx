import { addMonths, parseMoneyInput } from "@goal4me/core";
import { savingsGoalSchema } from "@goal4me/schemas";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import {
  AppText,
  Banner,
  Button,
  ChoiceCard,
  Screen,
  SegmentedControl,
  TextField,
} from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { toCurrency, useCreateGoal, useSavingsGoals } from "@/features/money/api";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";

type Horizon = "none" | "3" | "6" | "12" | "24";
const HORIZONS: { value: Horizon; label: string }[] = [
  { value: "none", label: "No date" },
  { value: "3", label: "3 mo" },
  { value: "6", label: "6 mo" },
  { value: "12", label: "1 yr" },
  { value: "24", label: "2 yr" },
];

/** Create a savings goal with an optional target date. */
export default function NewGoal() {
  const userId = useUserId();
  const summary = useHomeSummary(userId);
  const goals = useSavingsGoals(userId);
  const create = useCreateGoal(userId);
  const [id] = useState(() => randomUUID());
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [horizon, setHorizon] = useState<Horizon>("12");
  const [emergency, setEmergency] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; target?: string }>({});

  if (summary.isPending || goals.isPending) return <LoadingView />;
  if (summary.isError || goals.isError) {
    return (
      <ErrorView
        message={toUserMessage(summary.error ?? goals.error)}
        onRetry={() => void Promise.all([summary.refetch(), goals.refetch()])}
      />
    );
  }
  const hasEmergencyFund = goals.data.some((g) => g.isEmergencyFund);
  const currency = toCurrency(summary.data.profile.currency);

  const submit = () => {
    const parsed = savingsGoalSchema.safeParse({
      id,
      name,
      targetMinor: parseMoneyInput(target) ?? 0,
      currency,
      dueOn: horizon === "none" ? undefined : addMonths(localToday(), Number(horizon)),
      isEmergencyFund: emergency,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "name") next.name ??= issue.message;
        if (issue.path[0] === "targetMinor") next.target ??= "Enter a target amount";
      }
      setErrors(next);
      return;
    }
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: () => router.replace({ pathname: "/money/goal/[id]", params: { id } }),
    });
  };

  return (
    <Screen footer={<Button label="Create goal" loading={create.isPending} onPress={submit} />}>
      <BackButton variant="close" />
      <AppText variant="title" accessibilityRole="header">
        New savings goal
      </AppText>
      {create.isError ? <Banner message={toUserMessage(create.error)} /> : null}
      <TextField
        label="What are you saving for?"
        value={name}
        onChangeText={setName}
        maxLength={60}
        error={errors.name}
        placeholder={emergency ? "Emergency fund" : "e.g. Laptop, school fees"}
      />
      <TextField
        label="Target amount"
        value={target}
        onChangeText={setTarget}
        keyboardType="decimal-pad"
        suffix={currency}
        error={errors.target}
      />
      <AppText variant="caption" color="textMuted">
        Reach it in
      </AppText>
      <SegmentedControl
        options={HORIZONS}
        value={horizon}
        onChange={setHorizon}
        accessibilityLabel="Target date"
      />
      {!hasEmergencyFund ? (
        <ChoiceCard
          multi
          label="This is my emergency fund"
          description="Money for real surprises only. Aim for 3 months of needs."
          selected={emergency}
          onPress={() => setEmergency((v) => !v)}
        />
      ) : null}
    </Screen>
  );
}
