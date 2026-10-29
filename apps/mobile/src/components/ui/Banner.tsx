import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { AppText } from "./AppText";

type Tone = "danger" | "warning" | "info" | "success";

/** Inline message for errors and notices; announced by screen readers. */
export function Banner({ tone = "danger", message }: { tone?: Tone; message: string }) {
  return (
    <View
      style={[styles.banner, { borderColor: colors[tone] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.bar, { backgroundColor: colors[tone] }]} />
      <AppText variant="caption" style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  bar: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  text: { flex: 1 },
});
