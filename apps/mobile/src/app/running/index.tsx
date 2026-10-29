import {
  currentRunWeek,
  isRunPlanComplete,
  nextRunnerLevel,
  RUN_GOAL_LABEL,
  suggestLevelChange,
} from "@goal4me/core";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Card, ProgressBar, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { planWeeks, useRunningPlan, type RunningPlan } from "@/features/running/api";
import { SessionRow } from "@/features/running/components/SessionRow";
import { LEVEL_LABEL, RUNNER_STAGES, RUNNING_TIPS } from "@/features/running/guide";
import { toUserMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

/** Running hub: the user's plan this week, the novice-to-pro path and tips. */
export default function Running() {
  const userId = useUserId();
  const plan = useRunningPlan(userId);

  if (plan.isPending) return <LoadingView />;
  if (plan.isError) {
    return <ErrorView message={toUserMessage(plan.error)} onRetry={() => void plan.refetch()} />;
  }

  return (
    <Screen>
      <BackButton />
      <AppText variant="title" accessibilityRole="header">
        Running
      </AppText>
      {plan.data ? <PlanCard plan={plan.data} /> : <StartCard />}
      <PathCard level={plan.data?.level ?? null} />
      <TipsCard />
    </Screen>
  );
}

function StartCard() {
  return (
    <Card>
      <AppText variant="overline" color="brand">
        Become a runner
      </AppText>
      <AppText variant="heading">From your first steps to your best race</AppText>
      <AppText color="textMuted">
        Answer two quick questions and we'll build a week-by-week plan around your level, your goal
        and the days you can run. Change it any time.
      </AppText>
      <Button label="Build my running plan" onPress={() => router.push("/running/plan")} />
    </Card>
  );
}

function PlanCard({ plan }: { plan: RunningPlan }) {
  const weeks = planWeeks(plan);
  const complete = isRunPlanComplete(weeks, plan.logs);
  const weekNumber = currentRunWeek(weeks, plan.logs);
  const week = weeks[weekNumber - 1];
  if (!week) return null;
  const done = new Set(plan.logs.map((l) => `${l.week}:${l.sessionIndex}`));
  const nextIndex = week.sessions.findIndex((_, i) => !done.has(`${week.week}:${i}`));
  const totalSessions = weeks.reduce((sum, w) => sum + w.sessions.length, 0);
  const suggestion = suggestLevelChange(plan.logs.map((l) => l.rating));
  const suggestedLevel = suggestion ? nextRunnerLevel(plan.level, suggestion) : null;

  return (
    <Card>
      <AppText variant="overline" color="brand">
        {LEVEL_LABEL[plan.level]} · {RUN_GOAL_LABEL[plan.goal]} plan
      </AppText>
      {complete ? (
        <>
          <AppText variant="heading">Plan complete! 🎉</AppText>
          <AppText color="textMuted">
            You finished all {plan.weeks} weeks. Ready for the next challenge? Pick a new goal or
            move up a level.
          </AppText>
          <Button label="Start a new plan" onPress={() => router.push("/running/plan")} />
        </>
      ) : (
        <>
          <AppText variant="heading">
            Week {week.week} of {plan.weeks}
            {week.isCutback ? " · lighter week" : week.isTaper ? " · taper" : ""}
          </AppText>
          <ProgressBar value={plan.logs.length / totalSessions} />
          <AppText variant="caption" color="textMuted">
            {plan.logs.length} of {totalSessions} runs done · about {week.totalMinutes} min this
            week
          </AppText>
          {suggestedLevel && suggestedLevel !== plan.level ? (
            <Banner
              tone="info"
              message={
                suggestion === "up"
                  ? `Your last runs felt too easy. You might be ready for the ${LEVEL_LABEL[suggestedLevel]} level.`
                  : `Your last runs felt too hard. Dropping to ${LEVEL_LABEL[suggestedLevel]} for a while is a smart move.`
              }
            />
          ) : null}
          {week.sessions.map((session, i) => (
            <SessionRow
              key={i}
              session={session}
              index={i}
              done={done.has(`${week.week}:${i}`)}
              isNext={i === nextIndex}
              onPress={() =>
                router.push({
                  pathname: "/running/log",
                  params: { week: String(week.week), session: String(i) },
                })
              }
            />
          ))}
        </>
      )}
      <View style={styles.actions}>
        <Button
          label="Full plan"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push("/running/schedule")}
        />
        <Button
          label="Customise"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push("/running/plan")}
        />
      </View>
    </Card>
  );
}

function PathCard({ level }: { level: RunningPlan["level"] | null }) {
  return (
    <Card>
      <AppText variant="heading">Novice to pro</AppText>
      <AppText color="textMuted">
        Five stages, what to focus on at each, and how you know you're ready for the next.
      </AppText>
      <View style={styles.path}>
        {RUNNER_STAGES.map((stage, i) => {
          const current = stage.level === level;
          return (
            <View key={stage.level} style={styles.pathStep}>
              <View style={[styles.dot, current && styles.dotCurrent]}>
                <AppText variant="caption" color={current ? "onBrand" : "textMuted"}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="caption" color={current ? "brand" : "textMuted"} align="center">
                {stage.title}
              </AppText>
            </View>
          );
        })}
      </View>
      <Button
        label="Read the guide"
        variant="secondary"
        onPress={() => router.push("/running/guide")}
      />
    </Card>
  );
}

function TipsCard() {
  return (
    <Card>
      <AppText variant="heading">Running tips</AppText>
      {RUNNING_TIPS.map((category) => (
        <Pressable
          key={category.id}
          style={({ pressed }) => [styles.tipRow, pressed && styles.pressed]}
          onPress={() =>
            router.push({ pathname: "/running/tips", params: { category: category.id } })
          }
          accessibilityRole="button"
          accessibilityLabel={`${category.title}, ${category.tips.length} tips`}
        >
          <AppText variant="heading">{category.icon}</AppText>
          <AppText style={styles.flex}>{category.title}</AppText>
          <AppText variant="caption" color="textSubtle">
            {category.tips.length} ›
          </AppText>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  path: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  pathStep: { alignItems: "center", gap: spacing.xs, flex: 1 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCurrent: { backgroundColor: colors.brand, borderColor: colors.brand },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  pressed: { opacity: 0.7 },
});
