import type { RunSession } from "@goal4me/core";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { SESSION_LABEL } from "../guide";

interface SessionRowProps {
  session: RunSession;
  index: number;
  done: boolean;
  /** Next session to run: highlighted. */
  isNext?: boolean;
  showDescription?: boolean;
  onPress: () => void;
}

/** One planned run: tick, type, minutes and (optionally) instructions. */
export function SessionRow({
  session,
  index,
  done,
  isNext = false,
  showDescription = true,
  onPress,
}: SessionRowProps) {
  const label = SESSION_LABEL[session.type];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Run ${index + 1}: ${label}, ${session.minutes} minutes${done ? ", done" : ""}`}
      accessibilityHint={done ? "Edit or undo this run" : "Log this run"}
      style={({ pressed }) => [styles.row, isNext && styles.next, pressed && styles.pressed]}
    >
      <View style={[styles.tick, done && styles.tickDone]}>
        <AppText variant="caption" color={done ? "onBrand" : "textSubtle"}>
          {done ? "✓" : index + 1}
        </AppText>
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" color={done ? "textMuted" : "text"} style={styles.flex}>
            {label}
          </AppText>
          <AppText variant="caption" color={isNext ? "brand" : "textMuted"}>
            {session.minutes} min
          </AppText>
        </View>
        {showDescription ? (
          <AppText variant="caption" color="textMuted">
            {session.description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  next: { borderColor: colors.brand, backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.8 },
  tick: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tickDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
});
