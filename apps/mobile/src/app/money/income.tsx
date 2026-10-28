import { monthStart } from "@goal4me/core";
import { router } from "expo-router";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { toCurrency, useBudgetMonth } from "@/features/money/api";
import { BudgetSetupCard } from "@/features/money/components/BudgetSetupCard";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";

/** Change this month's income. Category limits are kept as they are. */
export default function EditIncome() {
  const userId = useUserId();
  const summary = useHomeSummary(userId);
  const month = useBudgetMonth(userId, monthStart(localToday()));

  if (summary.isPending || month.isPending) return <LoadingView />;
  if (summary.isError || month.isError) {
    return (
      <ErrorView
        message={toUserMessage(summary.error ?? month.error)}
        onRetry={() => void Promise.all([summary.refetch(), month.refetch()])}
      />
    );
  }
  const budget = month.data.budget;
  return (
    <Screen>
      <BackButton variant="close" />
      <BudgetSetupCard
        userId={userId}
        currency={budget?.currency ?? toCurrency(summary.data.profile.currency)}
        initialIncomeMinor={budget?.incomeMinor ?? month.data.previousIncomeMinor}
        title="Monthly income"
        onDone={() => router.back()}
      />
    </Screen>
  );
}
