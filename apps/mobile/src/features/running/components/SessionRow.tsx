import { formatDuration, type RunSession } from "@goal4me/core";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { formatRunDate, SESSION_LABEL } from "../copy";
import type { RunSessionState } from "../gating";
import { SegmentStrip } from "./SegmentStrip";

/** One run in a plan list: date, what it is, how long, and its shape. */
export function SessionRow({
  session,
  state,
  onPress,
}: {
  session: RunSession;
  state: RunSessionState;
  onPress: () => void;
}) {
  const done = state === "done";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatRunDate(session.date)}, ${session.title}, ${formatDuration(session.totalSeconds)}${
        done ? ", done" : state === "locked" ? ", Premium" : state === "next" ? ", next run" : ""
      }`}
      style={({ pressed }) => [
        styles.row,
        state === "next" && styles.next,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tick, done && styles.tickDone]}>
        <AppText variant="caption" color={done ? "onBrand" : "textSubtle"}>
          {done ? "✓" : state === "locked" ? "🔒" : session.runNumber}
        </AppText>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" color={done ? "textMuted" : "text"} style={styles.flex}>
            {session.title}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {formatDuration(session.totalSeconds)}
          </AppText>
        </View>
        <AppText variant="caption" color={state === "next" ? "brand" : "textSubtle"}>
          {formatRunDate(session.date)} · {SESSION_LABEL[session.type]}
        </AppText>
        <SegmentStrip segments={session.segments} height={6} />
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
  },
  next: { backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.7 },
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
  body: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
});
