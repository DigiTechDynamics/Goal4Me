import { StyleSheet, View } from "react-native";
import { colors, radii, type ColorToken } from "@/theme/tokens";

/**
 * A slim horizontal meter. Unlike ProgressBar it can show overspending:
 * past 100% the fill turns to the warning colour and stays full.
 */
export function Meter({ value, color = "brand" }: { value: number; color?: ColorToken }) {
  const over = value > 1;
  const width = `${Math.min(1, Math.max(0, value)) * 100}%` as const;
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(value, 9.99) * 100) }}
    >
      <View style={[styles.fill, { width, backgroundColor: colors[over ? "danger" : color] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised },
  fill: { height: 8, borderRadius: radii.pill },
});
