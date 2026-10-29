import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** e.g. "days a week". */
  unit: string;
  onChange: (value: number) => void;
}

/** − value + control for small whole numbers. */
export function Stepper({ label, value, min, max, unit, onChange }: StepperProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.flex}>{label}</AppText>
      <View
        style={styles.control}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: `${value} ${unit}` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "increment") onChange(Math.min(max, value + 1));
          if (e.nativeEvent.actionName === "decrement") onChange(Math.max(min, value - 1));
        }}
      >
        <StepButton label="−" disabled={value <= min} onPress={() => onChange(value - 1)} />
        <View style={styles.value}>
          <AppText variant="heading">{value}</AppText>
          <AppText variant="caption" color="textMuted">
            {unit}
          </AppText>
        </View>
        <StepButton label="+" disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

function StepButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      importantForAccessibility="no"
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="heading" color={disabled ? "textSubtle" : "brand"}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  control: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  value: { alignItems: "center", minWidth: 72 },
  button: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
