import { averageMet, estimateKcal, type BuiltWorkout, type ExerciseInfo } from "@goal4me/core";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { MOTIONS } from "../motion/motions";
import { summariseWorkout } from "../overview";
import { ExerciseGuideSheet } from "./ExerciseGuideSheet";
import { ExerciseMotion } from "./ExerciseMotion";
import { MuscleChips } from "./MuscleChips";

/**
 * What's in today's workout before it starts: time, calories, muscles,
 * equipment and every exercise (tap one for its full guide).
 */
export function WorkoutOverviewView({
  title,
  dayNumber,
  workout,
  weightKg,
  library,
  onStart,
}: {
  title: string;
  dayNumber: number;
  workout: BuiltWorkout;
  weightKg: number;
  library: Readonly<Record<string, ExerciseInfo>>;
  onStart: () => void;
}) {
  const overview = useMemo(() => summariseWorkout(workout), [workout]);
  const [open, setOpen] = useState<ExerciseInfo | null>(null);
  const minutes = Math.max(1, Math.round(workout.estimatedSec / 60));
  const kcal = estimateKcal({
    met: averageMet(workout.steps),
    weightKg,
    durationSec: workout.estimatedSec,
  });

  return (
    <Screen footer={<Button label="Start workout" onPress={onStart} />}>
      <BackButton variant="close" />
      <View style={styles.header}>
        <AppText variant="overline" color="brand">
          {dayNumber > 0 ? `Day ${dayNumber}` : "Today's workout"}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
      </View>

      <View style={styles.stats}>
        <Stat value={`${minutes}`} label="min" />
        <Stat value={`~${kcal}`} label="kcal" />
        <Stat value={`${overview.exerciseCount}`} label="moves" />
      </View>

      {overview.muscles.length ? (
        <View style={styles.block}>
          <AppText variant="caption" color="textMuted">
            Muscles worked
          </AppText>
          <MuscleChips muscles={overview.muscles} max={6} />
        </View>
      ) : null}
      <AppText variant="caption" color="textMuted">
        {overview.equipment.length
          ? `You'll need ${overview.equipment.join(" and ")}. Nothing else.`
          : "No equipment needed. Clear a space about the size of a yoga mat."}
      </AppText>

      {overview.groups.map((group) => (
        <View key={group.phase} style={styles.block}>
          <View style={styles.groupHeader}>
            <AppText variant="heading" style={styles.flex}>
              {group.label}
            </AppText>
            {group.phase === "main" && group.items[0] ? (
              <AppText variant="caption" color="textMuted">
                {group.items[0].rounds} {group.items[0].rounds === 1 ? "round" : "rounds"}
              </AppText>
            ) : null}
          </View>
          <Card style={styles.list}>
            {group.items.map((item, i) => (
              <Pressable
                key={item.exercise.id}
                style={[styles.row, i > 0 && styles.rowDivider]}
                onPress={() => setOpen(item.exercise)}
                accessibilityRole="button"
                accessibilityLabel={`${item.exercise.name}, ${item.target}. Show how to do it`}
              >
                <Thumb slug={item.exercise.slug} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{item.exercise.name}</AppText>
                  <AppText variant="caption" color="textMuted" numberOfLines={2}>
                    {item.exercise.details?.description ?? item.exercise.formTips[0] ?? ""}
                  </AppText>
                  {item.substituted ? (
                    <AppText variant="caption" color="info">
                      Swapped in to suit you
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.target}>
                  <AppText variant="bodyStrong" color="brand">
                    {item.target}
                  </AppText>
                  <AppText variant="caption" color="textSubtle">
                    How to ›
                  </AppText>
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      <ExerciseGuideSheet
        exercise={open}
        easierName={open?.easierId ? (library[open.easierId]?.name ?? null) : null}
        onClose={() => setOpen(null)}
      />
    </Screen>
  );
}

/** The exercise's key position as a still picture. */
function Thumb({ slug }: { slug: string }) {
  const motion = MOTIONS[slug];
  return (
    <View style={styles.thumb}>{motion ? <ExerciseMotion motion={motion} still /> : null}</View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <AppText variant="title" color="brand">
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center", paddingVertical: spacing.md },
  block: { gap: spacing.sm },
  groupHeader: { flexDirection: "row", alignItems: "baseline" },
  flex: { flex: 1, gap: 2 },
  list: { padding: 0, gap: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  thumb: {
    width: 64,
    height: 48,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  target: { alignItems: "flex-end", gap: 2 },
});
