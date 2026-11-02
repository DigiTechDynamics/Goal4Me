import { AccountActions } from "@goal4me/app-kit/account/components/AccountActions";
import { PrivacyCard } from "@goal4me/app-kit/account/components/PrivacyCard";
import { useAuth } from "@goal4me/app-kit/auth/AuthProvider";
import { PremiumCard } from "@goal4me/app-kit/billing/components/PremiumCard";
import { InfoRow } from "@goal4me/app-kit/components/InfoRow";
import { AppText, Card, Screen } from "@goal4me/app-kit/components/ui";
import { spacing } from "@goal4me/app-kit/theme/tokens";
import { StyleSheet } from "react-native";
import { HealthCard } from "@/features/health/components/HealthCard";
import { useHomeSummary } from "@/features/home/api";
import { formatHeight } from "@/features/onboarding/units";

/** Profile tab: plan, body details, health sync, privacy and the shared account actions. */
export default function Profile() {
  const { session } = useAuth();
  const summary = useHomeSummary(session?.user.id ?? "");
  const profile = summary.data?.profile;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Profile
      </AppText>
      {session ? <PremiumCard userId={session.user.id} /> : null}
      <Card>
        <InfoRow label="Email" value={session?.user.email ?? "—"} />
        <InfoRow
          label="Height"
          value={profile?.heightCm ? formatHeight(profile.heightCm, profile.units) : "—"}
        />
        <InfoRow
          label="Units"
          value={profile?.units === "imperial" ? "Pounds and feet" : "Kilograms and centimetres"}
          last
        />
      </Card>
      <HealthCard />
      <PrivacyCard />
      <AccountActions />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: spacing.md },
});
