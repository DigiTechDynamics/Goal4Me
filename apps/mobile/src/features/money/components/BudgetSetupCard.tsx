import { monthStart, parseMoneyInput, split503020, type CurrencyCode } from "@goal4me/core";
import { budgetSetupSchema } from "@goal4me/schemas";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Card, TextField } from "@/components/ui";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";
import { spacing } from "@/theme/tokens";
import { useSetupBudget } from "../api";
import { moneyWhole } from "../format";

/**
 * Asks for this month's take-home income and previews the 50/30/20 split.
 * Used for a first budget and again at the start of every month.
 */
export function BudgetSetupCard({
  userId,
  currency,
  initialIncomeMinor,
  title,
  onDone,
}: {
  userId: string;
  currency: CurrencyCode;
  initialIncomeMinor: number | null;
  title: string;
  onDone?: () => void;
}) {
  const setup = useSetupBudget(userId);
  const [text, setText] = useState(initialIncomeMinor ? String(initialIncomeMinor / 100) : "");
  const [error, setError] = useState<string | undefined>();
  const incomeMinor = parseMoneyInput(text);
  const split = incomeMinor ? split503020(incomeMinor) : null;

  const submit = () => {
    const parsed = budgetSetupSchema.safeParse({
      month: monthStart(localToday()),
      incomeMinor: incomeMinor ?? 0,
      currency,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter your monthly income");
      return;
    }
    setError(undefined);
    setup.mutate(parsed.data, { onSuccess: onDone });
  };

  return (
    <Card>
      <AppText variant="heading">{title}</AppText>
      <AppText color="textMuted">
        What do you take home this month, after tax? We'll suggest limits using the 50/30/20 rule,
        and you can change any of them.
      </AppText>
      {setup.isError ? <Banner message={toUserMessage(setup.error)} /> : null}
      <TextField
        label="Monthly take-home income"
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        suffix={currency}
        error={error}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {split ? (
        <View style={styles.split}>
          <SplitItem label="Needs 50%" value={moneyWhole(split.needsMinor, currency)} />
          <SplitItem label="Wants 30%" value={moneyWhole(split.wantsMinor, currency)} />
          <SplitItem label="Savings 20%" value={moneyWhole(split.savingsMinor, currency)} />
        </View>
      ) : null}
      <Button label="Save budget" loading={setup.isPending} onPress={submit} />
    </Card>
  );
}

function SplitItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.item}>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="caption" color="textSubtle">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: "row", gap: spacing.md },
  item: { flex: 1, gap: 2 },
});
