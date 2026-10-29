import { StyleSheet, View } from "react-native";
import { colors, radii } from "@/theme/tokens";

/** Thin quiz progress bar; `value` is 0–1. */
export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radii.pill, backgroundColor: colors.brand },
});
