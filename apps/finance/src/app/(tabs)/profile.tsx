import { AccountActions } from "@goal4me/app-kit/account/components/AccountActions";
import { PrivacyCard } from "@goal4me/app-kit/account/components/PrivacyCard";
import { useAuth } from "@goal4me/app-kit/auth/AuthProvider";
import { PremiumCard } from "@goal4me/app-kit/billing/components/PremiumCard";
import { InfoRow } from "@goal4me/app-kit/components/InfoRow";
import { AppText, Card, Screen } from "@goal4me/app-kit/components/ui";
import { spacing } from "@goal4me/app-kit/theme/tokens";
import { StyleSheet } from "react-native";
import { useMoneyProfile } from "@/features/profile/api";
import { COUNTRY_OPTIONS, CURRENCY_LABEL, MONEY_GOAL_OPTIONS } from "@/features/setup/flow";

/** Profile tab: Premium, money settings, privacy and the shared account actions. */
export default function Profile() {
  const { session } = useAuth();
  const profile = useMoneyProfile(session?.user.id ?? "").data;
  const country = COUNTRY_OPTIONS.find((c) => c.value === profile?.country)?.label;
  const goal = MONEY_GOAL_OPTIONS.find((g) => g.value === profile?.moneyGoal)?.label;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Profile
      </AppText>
      {session ? <PremiumCard userId={session.user.id} /> : null}
      <Card>
        <InfoRow label="Email" value={session?.user.email ?? "—"} />
        <InfoRow label="Country" value={country ?? "—"} />
        <InfoRow
          label="Currency"
          value={
            profile?.currency ? `${profile.currency} · ${CURRENCY_LABEL[profile.currency]}` : "—"
          }
        />
        <InfoRow label="Money goal" value={goal ?? "Not set"} last />
      </Card>
      <PrivacyCard />
      <AccountActions />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: spacing.md },
});
