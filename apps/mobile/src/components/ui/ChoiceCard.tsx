import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { AppText } from "./AppText";

interface ChoiceCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Checkbox look for multi-select questions, radio look otherwise. */
  multi?: boolean;
}

/** A large, thumb-friendly answer option used throughout the quiz. */
export function ChoiceCard({
  label,
  description,
  selected,
  onPress,
  multi = false,
}: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" color="textMuted">
            {description}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.indicator,
          multi ? styles.square : styles.round,
          selected && styles.indicatorOn,
        ]}
      >
        {selected ? (
          <View style={[styles.dot, multi ? styles.squareDot : styles.roundDot]} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selected: { borderColor: colors.brand, backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  indicator: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  round: { borderRadius: 12 },
  square: { borderRadius: 6 },
  indicatorOn: { borderColor: colors.brand },
  dot: { backgroundColor: colors.brand },
  roundDot: { width: 12, height: 12, borderRadius: 6 },
  squareDot: { width: 12, height: 12, borderRadius: 3 },
});
