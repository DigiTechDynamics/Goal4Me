import { monthStart } from "@goal4me/core";
import { router } from "expo-router";
import { BackButton } from "@goal4me/app-kit/components/BackButton";
import { ErrorView, LoadingView } from "@goal4me/app-kit/components/StateViews";
import { Screen } from "@goal4me/app-kit/components/ui";
import { useUserId } from "@goal4me/app-kit/auth/AuthProvider";
import { useMoneyProfile } from "@/features/profile/api";
import { toCurrency, useBudgetMonth } from "@/features/money/api";
import { BudgetSetupCard } from "@/features/money/components/BudgetSetupCard";
import { toUserMessage } from "@goal4me/app-kit/lib/errors";
import { localToday } from "@goal4me/app-kit/lib/format";

/** Change this month's income. Category limits are kept as they are. */
export default function EditIncome() {
  const userId = useUserId();
  const profile = useMoneyProfile(userId);
  const month = useBudgetMonth(userId, monthStart(localToday()));

  if (profile.isPending || month.isPending) return <LoadingView />;
  if (profile.isError || month.isError) {
    return (
      <ErrorView
        message={toUserMessage(profile.error ?? month.error)}
        onRetry={() => void Promise.all([profile.refetch(), month.refetch()])}
      />
    );
  }
  const budget = month.data.budget;
  return (
    <Screen>
      <BackButton variant="close" />
      <BudgetSetupCard
        userId={userId}
        currency={budget?.currency ?? toCurrency(profile.data.currency)}
        initialIncomeMinor={budget?.incomeMinor ?? month.data.previousIncomeMinor}
        title="Monthly income"
        onDone={() => router.back()}
      />
    </Screen>
  );
}
