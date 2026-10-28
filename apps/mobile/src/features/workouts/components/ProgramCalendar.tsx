import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import type { ProgramPlan } from "../api";

/** 4 × 7 grid of the programme: done, next up, upcoming, locked and rest days. */
export function ProgramCalendar({
  plan,
  nextDayId,
  isLocked,
  onOpen,
}: {
  plan: ProgramPlan;
  nextDayId: string | null;
  /** Premium-only days for this user; tapping one still calls onOpen (which shows the paywall). */
  isLocked: (day: ProgramPlan["days"][number]) => boolean;
  onOpen: (dayId: string) => void;
}) {
  const done = new Set(plan.completedDayIds);
  const weeks = Array.from({ length: Math.ceil(plan.days.length / 7) }, (_, w) =>
    plan.days.slice(w * 7, w * 7 + 7),
  );

  return (
    <View style={styles.grid}>
      {weeks.map((week, w) => (
        <View key={w} style={styles.week}>
          <AppText variant="caption" color="textSubtle" style={styles.weekLabel}>
            W{w + 1}
          </AppText>
          {week.map((day) => {
            const isDone = done.has(day.id);
            const isNext = day.id === nextDayId;
            const locked = !isDone && isLocked(day);
            const state = day.isRestDay
              ? "rest"
              : isDone
                ? "done"
                : locked
                  ? "locked"
                  : isNext
                    ? "next"
                    : "upcoming";
            return (
              <Pressable
                key={day.id}
                disabled={day.isRestDay}
                onPress={() => onOpen(day.id)}
                accessibilityRole="button"
                accessibilityLabel={`Day ${day.dayNumber}, ${day.isRestDay ? "rest day" : day.title}${isDone ? ", done" : locked ? ", Premium" : ""}`}
                style={[styles.cell, styles[state]]}
              >
                <AppText
                  variant="caption"
                  color={
                    state === "done" || state === "next"
                      ? "onBrand"
                      : day.isRestDay || locked
                        ? "textSubtle"
                        : "text"
                  }
                >
                  {isDone ? "✓" : day.isRestDay ? "–" : locked ? "🔒" : day.dayNumber}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  week: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  weekLabel: { width: 28 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  done: { backgroundColor: colors.success },
  next: { backgroundColor: colors.brand },
  upcoming: { backgroundColor: colors.surfaceRaised },
  locked: { backgroundColor: colors.surface },
  rest: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
});
