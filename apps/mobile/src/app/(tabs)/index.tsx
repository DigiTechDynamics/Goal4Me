import { StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { NeedsPlan } from "@/features/home/NeedsPlan";
import { usePlan } from "@/features/home/usePlan";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/features/onboarding/components/BmiScale";
import { formatWeight } from "@/features/onboarding/units";
import { toUserMessage } from "@/lib/errors";
import { formatDate, formatNumber } from "@/lib/format";
import { spacing } from "@/theme/tokens";

function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Today tab: the day's targets, streak and programme at a glance. */
export default function Today() {
  const userId = useUserId();
  const summary = useHomeSummary(userId);
  const plan = usePlan(summary.data);

  if (summary.isPending) return <LoadingView />;
  if (summary.isError) {
    return (
      <ErrorView message={toUserMessage(summary.error)} onRetry={() => void summary.refetch()} />
    );
  }

  const { profile, goal, program, streak, weights } = summary.data;
  const latest = weights[0];

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="caption" color="textMuted">
          {greeting()}
          {profile.displayName ? `, ${profile.displayName}` : ""}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          Today
        </AppText>
      </View>

      {!goal || !plan || !latest ? (
        <NeedsPlan />
      ) : (
        <>
          <View style={styles.row}>
            <Card style={styles.half}>
              <AppText variant="caption" color="textMuted">
                Streak
              </AppText>
              <AppText variant="display" color="brand">
                {streak?.currentDays ?? 0}
              </AppText>
              <AppText variant="caption" color="textSubtle">
                days · best {streak?.bestDays ?? 0}
              </AppText>
            </Card>
            <Card style={styles.half}>
              <AppText variant="caption" color="textMuted">
                BMI
              </AppText>
              <AppText variant="display" style={{ color: CATEGORY_COLOR[plan.bmi.category] }}>
                {plan.bmi.bmi}
              </AppText>
              <AppText variant="caption" color="textSubtle">
                {CATEGORY_LABEL[plan.bmi.category]} · {formatWeight(latest.weightKg, profile.units)}
              </AppText>
            </Card>
          </View>

          <Card>
            <AppText variant="overline" color="textMuted">
              Daily targets
            </AppText>
            <View style={styles.targets}>
              <Target
                label="Calories"
                value={plan.calorieTarget ? formatNumber(plan.calorieTarget.kcal) : "Ask a pro"}
                unit={plan.calorieTarget ? "kcal" : ""}
              />
              <Target label="Protein" value={String(plan.proteinG)} unit="g" />
              <Target label="Water" value={(plan.waterMl / 1000).toFixed(1)} unit="L" />
            </View>
          </Card>

          <Card>
            <AppText variant="overline" color="textMuted">
              Your programme
            </AppText>
            <AppText variant="heading">{program?.name ?? "Programme being prepared"}</AppText>
            <AppText color="textMuted">
              {program
                ? `Day ${program.currentDay} of ${program.durationDays} · ${goal.minutesPerSession} min · ${goal.daysPerWeek} days a week`
                : "Your workouts will appear here as soon as the programme library is live."}
            </AppText>
          </Card>

          {plan.projection.goalDate ? (
            <Card>
              <AppText variant="overline" color="textMuted">
                Goal
              </AppText>
              <AppText variant="bodyStrong">
                {formatWeight(goal.targetWeightKg, profile.units)} by{" "}
                {formatDate(plan.projection.goalDate)}
              </AppText>
              <AppText variant="caption" color="textMuted">
                Updates every time you log your weight.
              </AppText>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Target({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.target}>
      <AppText variant="heading">
        {value}
        <AppText variant="caption" color="textMuted">
          {unit ? ` ${unit}` : ""}
        </AppText>
      </AppText>
      <AppText variant="caption" color="textSubtle">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  targets: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  target: { flex: 1, gap: 2 },
});
