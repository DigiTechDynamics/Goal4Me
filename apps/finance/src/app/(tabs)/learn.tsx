import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@goal4me/app-kit/components/StateViews";
import { AppText, Card, Screen } from "@goal4me/app-kit/components/ui";
import { useUserId } from "@goal4me/app-kit/auth/AuthProvider";
import { useIsPremium } from "@goal4me/app-kit/billing/api";
import { openPaywall } from "@goal4me/app-kit/billing/gating";
import { Meter } from "@/features/money/components/Meter";
import { TRACK_LABEL, TRACK_ORDER, useLessons } from "@/features/money/lessons";
import { toUserMessage } from "@goal4me/app-kit/lib/errors";
import { colors, radii, spacing } from "@goal4me/app-kit/theme/tokens";

/** Learn tab: all money lessons, grouped by track, with completion ticks. */
export default function Learn() {
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
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
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
  title: { paddingTop: spacing.md },
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
