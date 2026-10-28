import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Card, Screen } from "@/components/ui";
import { signOut } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { formatHeight } from "@/features/onboarding/units";
import { toUserMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";

/** Profile tab: account details, sign out and the legal notice. */
export default function Profile() {
  const { session } = useAuth();
  const summary = useHomeSummary(session?.user.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const doSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (caught) {
      setError(toUserMessage(caught));
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    // Alert has no buttons on the web, so confirm with the browser dialog there.
    if (Platform.OS === "web") {
      if (window.confirm("Sign out of Goal4Me?")) void doSignOut();
      return;
    }
    Alert.alert("Sign out?", "Your data stays safe in your account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void doSignOut() },
    ]);
  };

  const profile = summary.data?.profile;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Profile
      </AppText>
      {error ? <Banner message={error} /> : null}
      <Card>
        <Row label="Email" value={session?.user.email ?? "—"} />
        <Row
          label="Height"
          value={profile?.heightCm ? formatHeight(profile.heightCm, profile.units) : "—"}
        />
        <Row
          label="Units"
          value={profile?.units === "imperial" ? "Pounds and feet" : "Kilograms and centimetres"}
        />
        <Row label="Currency" value={profile?.currency ?? "—"} last />
      </Card>
      <Button label="Sign out" variant="secondary" loading={signingOut} onPress={confirmSignOut} />
      <AppText variant="caption" color="textSubtle">
        Goal4Me provides general fitness and financial education. It is not medical or financial
        advice. Check with a doctor before starting a new exercise programme.
      </AppText>
    </Screen>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <AppText color="textMuted">{label}</AppText>
      <AppText variant="bodyStrong" style={styles.value} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  value: { flexShrink: 1, textAlign: "right" },
});
