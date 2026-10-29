import { round } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { NeedsPlan } from "@/features/home/NeedsPlan";
import { formatWeight } from "@/features/onboarding/units";
import { toUserMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { colors, spacing } from "@/theme/tokens";

/** Progress tab: weight history and change since the first weigh-in. */
export default function Progress() {
  const userId = useUserId();
  const summary = useHomeSummary(userId);

  if (summary.isPending) return <LoadingView />;
  if (summary.isError) {
    return (
      <ErrorView message={toUserMessage(summary.error)} onRetry={() => void summary.refetch()} />
    );
  }
  const { weights, profile, goal } = summary.data;
  const latest = weights[0];
  const first = weights.at(-1);
  const change = latest && first ? round(latest.weightKg - first.weightKg, 1) : 0;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Progress
      </AppText>
      {!goal || !latest ? (
        <NeedsPlan />
      ) : (
        <>
          <Card>
            <AppText variant="caption" color="textMuted">
              Change since you started
            </AppText>
            <AppText variant="display" color={change <= 0 ? "success" : "warning"}>
              {change > 0 ? "+" : ""}
              {formatWeight(Math.abs(change) === 0 ? 0 : change, profile.units).replace("-", "−")}
            </AppText>
            <AppText variant="caption" color="textSubtle">
              Target {formatWeight(goal.targetWeightKg, profile.units)}
            </AppText>
          </Card>
          <AppText variant="overline" color="textMuted">
            Weigh-ins
          </AppText>
          <View>
            {weights.map((entry) => (
              <View key={entry.measuredOn} style={styles.row}>
                <AppText color="textMuted">{formatDate(entry.measuredOn)}</AppText>
                <AppText variant="bodyStrong">
                  {formatWeight(entry.weightKg, profile.units)}
                </AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption" color="textSubtle">
            Logging, charts, measurements and progress photos arrive in an upcoming update.
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
