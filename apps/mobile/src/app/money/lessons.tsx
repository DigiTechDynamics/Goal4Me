import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useIsPremium } from "@/features/billing/api";
import { openPaywall } from "@/features/billing/gating";
import { Meter } from "@/features/money/components/Meter";
import { TRACK_LABEL, TRACK_ORDER, useLessons } from "@/features/money/lessons";
import { toUserMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

/** All money lessons, grouped by track, with completion ticks. */
export default function Lessons() {
  const userId = useUserId();
  const lessons = useLessons(userId);
  const isPremium = useIsPremium(userId);

  if (lessons.isPending) return <LoadingView />;
  if (lessons.isError) {
    return (
      <ErrorView message={toUserMessage(lessons.error)} onRetry={() => void lessons.refetch()} />
    );
  }

  return (
    <Screen>
      <BackButton />
      <AppText variant="title" accessibilityRole="header">
        Money lessons
      </AppText>
      <AppText color="textMuted">
        Three minutes each, with a short quiz and one small action.
      </AppText>
      {TRACK_ORDER.map((track) => {
        const inTrack = lessons.data.filter((l) => l.track === track);
        if (inTrack.length === 0) return null;
        const done = inTrack.filter((l) => l.completed).length;
        return (
          <Card key={track}>
            <View style={styles.trackHeader}>
              <AppText variant="heading" style={styles.flex}>
                {TRACK_LABEL[track] ?? track}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {done}/{inTrack.length}
              </AppText>
            </View>
            <Meter value={done / inTrack.length} color="info" />
            {inTrack.map((lesson) => {
              const locked = lesson.isPremium && !isPremium;
              return (
                <Pressable
                  key={lesson.id}
                  style={styles.lesson}
                  onPress={() =>
                    locked
                      ? openPaywall("lesson")
                      : router.push({ pathname: "/money/lesson/[id]", params: { id: lesson.id } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${lesson.title}${lesson.completed ? ", completed" : locked ? ", Premium" : ""}`}
                >
                  <View style={[styles.tick, lesson.completed && styles.tickDone]}>
                    {lesson.completed ? (
                      <AppText variant="caption" color="onBrand">
                        ✓
                      </AppText>
                    ) : (
                      <AppText variant="caption" color="textSubtle">
                        {lesson.position}
                      </AppText>
                    )}
                  </View>
                  <AppText
                    style={styles.flex}
                    color={lesson.completed || locked ? "textMuted" : "text"}
                  >
                    {lesson.title}
                  </AppText>
                  {locked ? (
                    <AppText variant="caption" color="brand">
                      🔒 Premium
                    </AppText>
                  ) : null}
                </Pressable>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trackHeader: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  lesson: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
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
});
