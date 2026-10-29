import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { PREMIUM_BENEFITS } from "../copy";

/** Ticked list of what Premium unlocks. */
export function Benefits() {
  return (
    <View style={styles.list} accessibilityRole="list">
      {PREMIUM_BENEFITS.map((benefit) => (
        <View key={benefit} style={styles.row}>
          <View style={styles.tick}>
            <AppText variant="caption" color="onBrand">
              ✓
            </AppText>
          </View>
          <AppText style={styles.flex}>{benefit}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  tick: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
});
