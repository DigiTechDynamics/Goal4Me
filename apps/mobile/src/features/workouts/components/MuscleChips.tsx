import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";

/** Small pill tags for the muscles an exercise or workout works. */
export function MuscleChips({ muscles, max = 4 }: { muscles: readonly string[]; max?: number }) {
  if (muscles.length === 0) return null;
  const shown = muscles.slice(0, max);
  const more = muscles.length - shown.length;
  return (
    <View style={styles.row} accessibilityLabel={`Works: ${muscles.join(", ")}`}>
      {shown.map((muscle) => (
        <View key={muscle} style={styles.chip}>
          <AppText variant="caption" color="text">
            {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
          </AppText>
        </View>
      ))}
      {more > 0 ? (
        <View style={styles.chip}>
          <AppText variant="caption" color="textMuted">
            +{more}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
