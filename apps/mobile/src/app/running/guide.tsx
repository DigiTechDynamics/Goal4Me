import { RUN_GOAL_LABEL } from "@goal4me/core";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useRunningPlan } from "@/features/running/api";
import { RUNNER_STAGES } from "@/features/running/guide";
import { colors, radii, spacing } from "@/theme/tokens";

/** The five stages from novice to pro, with what to focus on at each. */
export default function RunningGuide() {
  const userId = useUserId();
  const plan = useRunningPlan(userId);
  const level = plan.data?.level ?? null;

  return (
    <Screen>
      <BackButton />
      <AppText variant="title" accessibilityRole="header">
        How to become a runner
      </AppText>
      <AppText color="textMuted">
        Every runner starts somewhere. Find the stage that sounds like you, focus on its few
        priorities, and move on when you hit its milestone. Most people spend a few months at each
        stage, and that's normal.
      </AppText>
      {RUNNER_STAGES.map((stage, i) => {
        const current = stage.level === level;
        return (
          <Card key={stage.level} style={current ? styles.current : undefined}>
            <View style={styles.header}>
              <View style={[styles.badge, current && styles.badgeCurrent]}>
                <AppText variant="bodyStrong" color={current ? "onBrand" : "text"}>
                  {i + 1}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="heading">{stage.title}</AppText>
                <AppText variant="caption" color={current ? "brand" : "textMuted"}>
                  {current ? "You are here · " : ""}
                  {stage.tagline}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color="textMuted">
              {stage.youAreHere}
            </AppText>
            <AppText variant="overline" color="textMuted" style={styles.section}>
              Focus on
            </AppText>
            {stage.focus.map((item) => (
              <View key={item} style={styles.bullet}>
                <AppText color="brand">•</AppText>
                <AppText style={styles.flex}>{item}</AppText>
              </View>
            ))}
            <AppText variant="overline" color="textMuted" style={styles.section}>
              Ready for the next stage when
            </AppText>
            <AppText variant="bodyStrong">{stage.milestone}</AppText>
            <AppText variant="caption" color="textMuted">
              Suggested goal: {RUN_GOAL_LABEL[stage.suggestedGoal]}
            </AppText>
          </Card>
        );
      })}
      <Button
        label={plan.data ? "Customise my plan" : "Build my running plan"}
        onPress={() => router.push("/running/plan")}
      />
      <AppText variant="caption" color="textSubtle">
        New to exercise, or have a heart, joint or other health condition? Check with a doctor
        before starting to run.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { borderColor: colors.brand },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCurrent: { backgroundColor: colors.brand },
  section: { marginTop: spacing.sm },
  bullet: { flexDirection: "row", gap: spacing.sm },
});
