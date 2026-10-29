import type { Weekday } from "@goal4me/core";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { WEEKDAYS } from "../copy";

/** Seven round toggles, Monday first. `marked` adds a dot (the long-run day). */
export function WeekdayPicker({
  selected,
  onToggle,
  marked,
  label,
}: {
  selected: readonly Weekday[];
  onToggle: (day: Weekday) => void;
  marked?: Weekday;
  label: string;
}) {
  return (
    <View style={styles.row} accessibilityLabel={label}>
      {WEEKDAYS.map((day) => {
        const on = selected.includes(day.value);
        return (
          <Pressable
            key={day.value}
            onPress={() => onToggle(day.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${day.long}${marked === day.value ? ", long run" : ""}`}
            style={({ pressed }) => [styles.day, on && styles.on, pressed && styles.pressed]}
          >
            <AppText variant="bodyStrong" color={on ? "onBrand" : "textMuted"}>
              {day.short}
            </AppText>
            {marked === day.value ? <View style={[styles.dot, on && styles.dotOn]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  on: { backgroundColor: colors.brand, borderColor: colors.brand },
  pressed: { opacity: 0.7 },
  dot: {
    position: "absolute",
    bottom: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  dotOn: { backgroundColor: colors.onBrand },
});
