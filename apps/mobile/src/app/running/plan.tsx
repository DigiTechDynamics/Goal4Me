import {
  assessRunnerLevel,
  generateRunPlan,
  MAX_DAYS_BY_LEVEL,
  recommendedWeeks,
  RUN_GOAL_LABEL,
  RUN_GOALS,
  RUN_PLAN_LIMITS,
  RUNNER_LEVELS,
  runPlanWarnings,
  type RunGoal,
  type RunnerLevel,
} from "@goal4me/core";
import { runPlanSchema } from "@goal4me/schemas";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Card, ChoiceCard, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useRunningPlan, useStartRunningPlan, type RunningPlan } from "@/features/running/api";
import { Stepper } from "@/features/running/components/Stepper";
import { LEVEL_LABEL, STAGE_BY_LEVEL } from "@/features/running/guide";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";
import { colors, radii, spacing } from "@/theme/tokens";

const CONTINUOUS = [
  { minutes: 0, label: "I can't run yet", description: "Or only for a minute or two" },
  { minutes: 10, label: "5–20 minutes", description: "Then I need to walk" },
  { minutes: 30, label: "20–45 minutes", description: "At an easy pace" },
  { minutes: 60, label: "45–90 minutes", description: "Comfortably" },
  { minutes: 100, label: "Over 90 minutes", description: "Long runs are normal for me" },
] as const;

const WEEKLY = [
  { km: 0, label: "I don't run yet" },
  { km: 10, label: "Under 15 km (9 mi)" },
  { km: 20, label: "15–30 km (9–19 mi)" },
  { km: 40, label: "30–55 km (19–34 mi)" },
  { km: 70, label: "Over 55 km (34 mi)" },
] as const;

const GOAL_DESCRIPTION: Record<RunGoal, string> = {
  "5k": "5 km / 3.1 mi: the perfect first goal",
  "10k": "10 km / 6.2 mi: a step up in endurance",
  half: "21.1 km / 13.1 mi: a serious challenge",
  marathon: "42.2 km / 26.2 mi: the big one",
};

/** Build or customise a running plan: level, goal, days a week and length. */
export default function RunningPlanScreen() {
  const userId = useUserId();
  const plan = useRunningPlan(userId);

  if (plan.isPending) return <LoadingView />;
  if (plan.isError) {
    return <ErrorView message={toUserMessage(plan.error)} onRetry={() => void plan.refetch()} />;
  }
  return <PlanForm userId={userId} current={plan.data} />;
}

function PlanForm({ userId, current }: { userId: string; current: RunningPlan | null }) {
  const start = useStartRunningPlan(userId);
  const [id] = useState(() => randomUUID());
  const [checkOpen, setCheckOpen] = useState(!current);
  const [continuous, setContinuous] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<number | null>(null);
  const [level, setLevel] = useState<RunnerLevel | null>(current?.level ?? null);
  const [goal, setGoal] = useState<RunGoal>(current?.goal ?? "5k");
  const [days, setDays] = useState(current?.daysPerWeek ?? 3);
  const [weeks, setWeeks] = useState<number | null>(current?.weeks ?? null);

  const answerCheck = (nextContinuous: number | null, nextWeekly: number | null) => {
    setContinuous(nextContinuous);
    setWeekly(nextWeekly);
    if (nextContinuous === null) return;
    // Can't run 20 minutes yet: weekly distance doesn't matter.
    if (nextContinuous < 20 || nextWeekly !== null) {
      const assessed = assessRunnerLevel({
        continuousMinutes: nextContinuous,
        weeklyKm: nextWeekly ?? 0,
      });
      setLevel(assessed);
      setGoal(STAGE_BY_LEVEL[assessed].suggestedGoal);
      setDays((d) => Math.min(d, MAX_DAYS_BY_LEVEL[assessed]));
      setWeeks(null);
    }
  };

  const planWeeks = level ? (weeks ?? recommendedWeeks(level, goal) ?? 12) : 12;
  const settings = level ? { level, goal, daysPerWeek: days, weeks: planWeeks } : null;
  const preview = settings ? generateRunPlan(settings) : null;
  const firstWeek = preview?.[0];
  const warnings = settings ? runPlanWarnings(settings) : [];
  const peak = preview ? Math.max(...preview.map((w) => w.totalMinutes)) : 0;

  const submit = () => {
    if (!settings) return;
    const parsed = runPlanSchema.safeParse({ id, ...settings, startedOn: localToday() });
    if (!parsed.success) return;
    start.mutate(parsed.data, { onSuccess: () => router.replace("/running") });
  };

  return (
    <Screen
      footer={
        <Button
          label={current ? "Start new plan" : "Start my plan"}
          disabled={!settings}
          loading={start.isPending}
          onPress={submit}
        />
      }
    >
      <BackButton variant="close" />
      <AppText variant="title" accessibilityRole="header">
        {current ? "Customise your plan" : "Your running plan"}
      </AppText>
      {start.isError ? <Banner message={toUserMessage(start.error)} /> : null}

      <AppText variant="heading">Your level</AppText>
      {checkOpen ? (
        <>
          <AppText color="textMuted">How long can you run without stopping?</AppText>
          {CONTINUOUS.map((option) => (
            <ChoiceCard
              key={option.minutes}
              label={option.label}
              description={option.description}
              selected={continuous === option.minutes}
              onPress={() => answerCheck(option.minutes, weekly)}
            />
          ))}
          {continuous !== null && continuous >= 20 ? (
            <>
              <AppText color="textMuted">How far do you run in a normal week?</AppText>
              {WEEKLY.map((option) => (
                <ChoiceCard
                  key={option.km}
                  label={option.label}
                  selected={weekly === option.km}
                  onPress={() => answerCheck(continuous, option.km)}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {level ? (
        <Card>
          <AppText variant="overline" color="brand">
            {checkOpen && continuous !== null ? "We suggest" : "Level"}
          </AppText>
          <AppText variant="heading">{LEVEL_LABEL[level]}</AppText>
          <AppText variant="caption" color="textMuted">
            {STAGE_BY_LEVEL[level].youAreHere}
          </AppText>
          <LevelPicker
            value={level}
            onChange={(next) => {
              setLevel(next);
              setDays((d) => Math.min(d, MAX_DAYS_BY_LEVEL[next]));
              setWeeks(null);
            }}
          />
          {!checkOpen ? (
            <Pressable onPress={() => setCheckOpen(true)} accessibilityRole="button" hitSlop={8}>
              <AppText variant="caption" color="brand">
                Not sure? Take the quick level check
              </AppText>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {level ? (
        <>
          <AppText variant="heading">Your goal</AppText>
          {RUN_GOALS.map((g) => (
            <ChoiceCard
              key={g}
              label={RUN_GOAL_LABEL[g].replace(/^./, (c) => c.toUpperCase())}
              description={GOAL_DESCRIPTION[g]}
              selected={goal === g}
              onPress={() => {
                setGoal(g);
                setWeeks(null);
              }}
            />
          ))}

          <AppText variant="heading">Your schedule</AppText>
          <Card>
            <Stepper
              label="Running days"
              value={days}
              min={RUN_PLAN_LIMITS.daysPerWeek.min}
              max={RUN_PLAN_LIMITS.daysPerWeek.max}
              unit="a week"
              onChange={setDays}
            />
            <Stepper
              label="Plan length"
              value={planWeeks}
              min={RUN_PLAN_LIMITS.weeks.min}
              max={RUN_PLAN_LIMITS.weeks.max}
              unit="weeks"
              onChange={setWeeks}
            />
          </Card>

          {warnings.map((w) => (
            <Banner key={w} tone="warning" message={w} />
          ))}

          {firstWeek ? (
            <Card>
              <AppText variant="overline" color="textMuted">
                Your plan at a glance
              </AppText>
              <AppText>
                Week 1: {firstWeek.sessions.length} runs, about {firstWeek.totalMinutes} minutes in
                total.
              </AppText>
              <AppText>Busiest week: about {peak} minutes.</AppText>
              <AppText>
                Goal day: your {RUN_GOAL_LABEL[goal]} in week {planWeeks}.
              </AppText>
              {current ? (
                <AppText variant="caption" color="textMuted">
                  Your new plan starts at week 1. Runs from your current plan stay in your history.
                </AppText>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function LevelPicker({
  value,
  onChange,
}: {
  value: RunnerLevel;
  onChange: (level: RunnerLevel) => void;
}) {
  return (
    <View style={styles.levels} accessibilityRole="radiogroup" accessibilityLabel="Level">
      {RUNNER_LEVELS.map((l) => {
        const selected = l === value;
        return (
          <Pressable
            key={l}
            onPress={() => onChange(l)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={LEVEL_LABEL[l]}
            style={[styles.levelChip, selected && styles.levelChipOn]}
          >
            <AppText variant="caption" color={selected ? "onBrand" : "textMuted"}>
              {LEVEL_LABEL[l]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  levels: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.xs },
  levelChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelChipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
});
