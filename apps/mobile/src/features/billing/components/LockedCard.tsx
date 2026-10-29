import { StyleSheet, View } from "react-native";
import { AppText, Button, Card } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import type { PaywallReason } from "../copy";
import { openPaywall } from "../gating";

/** Shown in place of premium content (a locked workout or lesson). */
export function LockedCard({
  title,
  message,
  reason,
}: {
  title: string;
  message: string;
  reason: PaywallReason;
}) {
  return (
    <Card>
      <View style={styles.lock} accessibilityElementsHidden importantForAccessibility="no">
        <AppText variant="heading" color="onBrand">
          🔒
        </AppText>
      </View>
      <AppText variant="heading">{title}</AppText>
      <AppText color="textMuted">{message}</AppText>
      <Button label="Unlock with Premium" onPress={() => openPaywall(reason)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  lock: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
});
