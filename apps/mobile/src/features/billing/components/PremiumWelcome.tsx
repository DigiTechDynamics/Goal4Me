import { StyleSheet, View } from "react-native";
import { AppText, Button } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { colors, radii, spacing } from "@/theme/tokens";

/** Celebration shown once premium is active (after paying, or if already premium). */
export function PremiumWelcome({
  expiresAt,
  autoRenews,
  onContinue,
}: {
  expiresAt: string | null;
  autoRenews: boolean;
  onContinue: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.medal}>
        <AppText variant="display" color="onBrand">
          ★
        </AppText>
      </View>
      <AppText variant="title" align="center" accessibilityRole="header">
        You're Premium
      </AppText>
      <AppText color="textMuted" align="center">
        Every workout and every money lesson is now unlocked.
      </AppText>
      {expiresAt ? (
        <AppText variant="caption" color="textSubtle" align="center">
          {autoRenews ? "Renews" : "Active until"} {formatTimestamp(expiresAt)}
        </AppText>
      ) : null}
      <Button label="Let's go" onPress={onContinue} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  medal: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  button: { alignSelf: "stretch" },
});
