import { currentRunWeek, RUN_GOAL_LABEL } from "@goal4me/core";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { planWeeks, useRunningPlan } from "@/features/running/api";
import { SessionRow } from "@/features/running/components/SessionRow";
import { LEVEL_LABEL } from "@/features/running/guide";
import { toUserMessage } from "@/lib/errors";
import { colors } from "@/theme/tokens";

/** Every week of the running plan; tap any run to log it. */
export default function RunningSchedule() {
  const userId = useUserId();
  const plan = useRunningPlan(userId);

  if (plan.isPending) return <LoadingView />;
  if (plan.isError) {
    return <ErrorView message={toUserMessage(plan.error)} onRetry={() => void plan.refetch()} />;
  }
  if (!plan.data) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">No running plan yet</AppText>
        <Button label="Build my running plan" onPress={() => router.replace("/running/plan")} />
      </Screen>
    );
  }

  const data = plan.data;
  const weeks = planWeeks(data);
  const current = currentRunWeek(weeks, data.logs);
  const done = new Set(data.logs.map((l) => `${l.week}:${l.sessionIndex}`));

  return (
    <Screen>
      <BackButton />
      <AppText variant="title" accessibilityRole="header">
        Your {RUN_GOAL_LABEL[data.goal]} plan
      </AppText>
      <AppText color="textMuted">
        {LEVEL_LABEL[data.level]} · {data.daysPerWeek} runs a week · {data.weeks} weeks. Run on any
        days you like, with a rest day after hard sessions and the long run.
      </AppText>
      {weeks.map((week) => {
        const isCurrent = week.week === current;
        const weekDone = week.sessions.every((_, i) => done.has(`${week.week}:${i}`));
        return (
          <Card key={week.week} style={isCurrent ? styles.current : undefined}>
            <View style={styles.header}>
              <AppText variant="heading" style={styles.flex}>
                Week {week.week}
                {weekDone ? " ✓" : ""}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {week.totalMinutes} min
              </AppText>
            </View>
            {isCurrent || week.isCutback || week.isTaper ? (
              <AppText variant="caption" color={isCurrent ? "brand" : "textMuted"}>
                {[
                  isCurrent ? "This week" : null,
                  week.isCutback ? "Lighter week to recover" : null,
                  week.isTaper ? "Taper: easing off before goal day" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </AppText>
            ) : null}
            {week.sessions.map((session, i) => (
              <SessionRow
                key={i}
                session={session}
                index={i}
                done={done.has(`${week.week}:${i}`)}
                showDescription={isCurrent}
                onPress={() =>
                  router.push({
                    pathname: "/running/log",
                    params: { week: String(week.week), session: String(i) },
                  })
                }
              />
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { borderColor: colors.brand },
  header: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
