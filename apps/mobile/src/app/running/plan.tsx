import { getRunProgram } from "@goal4me/core";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useIsPremium } from "@/features/billing/api";
import { useRunPlan } from "@/features/running/api";
import { SessionRow } from "@/features/running/components/SessionRow";
import { openRun, runSessionState } from "@/features/running/gating";
import { toUserMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";

/** Every week of the running plan, with done ticks and Premium locks. */
export default function FullPlan() {
  const userId = useUserId();
  const plan = useRunPlan(userId);
  const isPremium = useIsPremium(userId);

  if (plan.isPending) return <LoadingView />;
  if (plan.isError) {
    return <ErrorView message={toUserMessage(plan.error)} onRetry={() => void plan.refetch()} />;
  }
  const active = plan.data;
  if (!active?.plan) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">No running plan yet</AppText>
        <Button label="Build my running plan" onPress={() => router.replace("/running/setup")} />
      </Screen>
    );
  }
  const { sessions, weeks } = active.plan;
  const program = getRunProgram(active.settings.program);

  return (
    <Screen>
      <BackButton />
      <AppText variant="overline" color="brand">
        {program.name}
      </AppText>
      <AppText variant="title" accessibilityRole="header">
        Your {weeks}-week plan
      </AppText>
      <AppText color="textMuted">{program.goal}.</AppText>
      {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => {
        const inWeek = sessions.filter((s) => s.week === week);
        const done = inWeek.filter((s) => s.runNumber <= active.completedRuns).length;
        return (
          <Card key={week}>
            <View style={styles.header}>
              <AppText variant="heading" style={styles.flex}>
                Week {week}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {done}/{inWeek.length}
              </AppText>
            </View>
            {inWeek.map((session) => (
              <SessionRow
                key={session.runNumber}
                session={session}
                state={runSessionState(session.runNumber, active.completedRuns, isPremium)}
                onPress={() => openRun(session.runNumber, isPremium)}
              />
            ))}
          </Card>
        );
      })}
      <Button
        label="Edit my plan"
        variant="secondary"
        onPress={() => router.push("/running/setup")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
});
