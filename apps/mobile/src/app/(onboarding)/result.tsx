import { Redirect, router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { resultFromAnswers } from "@/features/onboarding/assessment";
import {
  BmiScale,
  CATEGORY_COLOR,
  CATEGORY_LABEL,
} from "@/features/onboarding/components/BmiScale";
import { ProjectionChart } from "@/features/onboarding/components/ProjectionChart";
import { toQuizAnswers } from "@/features/onboarding/steps";
import { useOnboardingStore } from "@/features/onboarding/store";
import { formatWeight } from "@/features/onboarding/units";
import { formatDate, formatNumber, localToday } from "@/lib/format";
import { colors, spacing } from "@/theme/tokens";

/** The personalised result: BMI, targets, goal date and programme. */
export default function Result() {
  const { session } = useAuth();
  const draft = useOnboardingStore((state) => state.draft);
  const answers = useMemo(() => toQuizAnswers(draft), [draft]);
  const result = useMemo(
    () => (answers ? resultFromAnswers(answers, localToday()) : null),
    [answers],
  );

  if (!answers || !result) return <Redirect href="/quiz" />;

  const { assessment, program } = result;
  const { bmi, projection } = assessment;
  const units = draft.units;
  const lastPoint = projection.points.at(-1);

  return (
    <Screen
      footer={
        <Button
          label={session ? "Save my plan" : "Create my free account"}
          accessibilityHint="Saves your answers so you can track your progress"
          // Signed-in users are redirected to the tabs, where answers sync automatically.
          onPress={() => router.replace(session ? "/(tabs)" : "/sign-up")}
        />
      }
    >
      <View style={styles.header}>
        <AppText variant="overline" color="brand">
          Your personal plan
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {projection.goalDate
            ? `You could reach ${formatWeight(answers.targetWeightKg, units)} by ${formatDate(projection.goalDate)}`
            : "Your plan is ready"}
        </AppText>
      </View>

      {lastPoint && projection.points.length > 1 ? (
        <Card>
          <ProjectionChart
            points={projection.points}
            startLabel={formatWeight(answers.weightKg, units)}
            endLabel={formatWeight(lastPoint.weightKg, units)}
          />
          {projection.weeks === null ? (
            <AppText variant="caption" color="textMuted">
              Your goal is more than 2 years away at a safe pace. We'll set milestones along the
              way.
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <View style={styles.rowBetween}>
          <AppText variant="bodyStrong">Body mass index</AppText>
          <AppText variant="heading" style={{ color: CATEGORY_COLOR[bmi.category] }}>
            {bmi.bmi} · {CATEGORY_LABEL[bmi.category]}
          </AppText>
        </View>
        <BmiScale bmi={bmi.bmi} category={bmi.category} />
        <AppText variant="caption" color="textMuted">
          {bmi.adultCutoffsApply
            ? `A healthy weight for your height is ${formatWeight(assessment.healthyRangeKg.minKg, units)} to ${formatWeight(assessment.healthyRangeKg.maxKg, units)}.`
            : "BMI bands are designed for adults, so treat this as a rough guide while you're still growing."}
        </AppText>
      </Card>

      <View style={styles.grid}>
        <Stat
          label="Daily calories"
          value={assessment.calorieTarget ? formatNumber(assessment.calorieTarget.kcal) : "—"}
          unit={assessment.calorieTarget ? "kcal" : ""}
        />
        <Stat label="Protein" value={String(assessment.proteinG)} unit="g / day" />
        <Stat label="Water" value={(assessment.waterMl / 1000).toFixed(1)} unit="L / day" />
      </View>

      {assessment.calorieTarget === null ? (
        <Card style={styles.notice}>
          <AppText variant="bodyStrong">Talk to a professional first</AppText>
          <AppText variant="caption" color="textMuted">
            Your BMI is below the healthy range, so we won't suggest a calorie target. A doctor or
            dietitian can help you gain weight safely. Your workouts are still tailored to you.
          </AppText>
        </Card>
      ) : assessment.calorieTarget.flooredAtMinimum ? (
        <AppText variant="caption" color="textMuted">
          We've kept your calories at a safe minimum rather than a bigger deficit.
        </AppText>
      ) : null}

      <Card>
        <AppText variant="overline" color="textMuted">
          Your programme
        </AppText>
        <AppText variant="heading">{program.name}</AppText>
        <AppText color="textMuted">
          {answers.daysPerWeek} workouts a week · {answers.minutesPerSession} minutes each · 28 days
        </AppText>
      </Card>

      <AppText variant="caption" color="textSubtle">
        Estimates use the Mifflin-St Jeor equation and WHO BMI bands. This is general guidance, not
        medical advice.
      </AppText>
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card style={styles.stat}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color="textSubtle">
        {unit}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.md },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  grid: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, gap: 2, padding: spacing.md },
  notice: { borderColor: colors.info },
});
