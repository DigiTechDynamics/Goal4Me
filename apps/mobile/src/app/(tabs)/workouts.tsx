import { PROGRAMS } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { NeedsPlan } from "@/features/home/NeedsPlan";
import { toUserMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

/** Workouts tab: the user's programme and the full programme catalogue. */
export default function Workouts() {
  const userId = useUserId();
  const summary = useHomeSummary(userId);

  if (summary.isPending) return <LoadingView />;
  if (summary.isError) {
    return (
      <ErrorView message={toUserMessage(summary.error)} onRetry={() => void summary.refetch()} />
    );
  }
  const { goal, program } = summary.data;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Workouts
      </AppText>
      {!goal ? (
        <NeedsPlan />
      ) : (
        <Card>
          <AppText variant="overline" color="brand">
            Your programme
          </AppText>
          <AppText variant="heading">{program?.name ?? "Being prepared"}</AppText>
          <AppText color="textMuted">
            {goal.daysPerWeek} workouts a week, {goal.minutesPerSession} minutes each.
          </AppText>
          <AppText variant="caption" color="textSubtle">
            Guided workouts with video and timers are coming in the next update.
          </AppText>
        </Card>
      )}
      <AppText variant="overline" color="textMuted">
        All programmes
      </AppText>
      {Object.entries(PROGRAMS).map(([slug, info]) => (
        <View key={slug} style={styles.program}>
          <AppText variant="bodyStrong">{info.name}</AppText>
          <AppText variant="caption" color="textMuted">
            28 days{info.lowImpact ? " · low impact" : ""}
          </AppText>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: spacing.md },
  program: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
});
