import {
  addDays,
  buildRunPlan,
  formatDuration,
  getRunProgram,
  paceZones,
  formatPaceRange,
  RUN_LEVEL_INFO,
  RUN_PROGRAM_SLUGS,
  RunPlanError,
  weekdayOf,
  type RunProgramSlug,
  type RunSettings,
  type Weekday,
} from "@goal4me/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import {
  AppText,
  Banner,
  Button,
  Card,
  ChoiceCard,
  Screen,
  SegmentedControl,
  TextField,
} from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import {
  useRunnerLevel,
  useRunPlan,
  useSaveRunPlan,
  type ActiveRunPlan,
} from "@/features/running/api";
import { WeekdayPicker } from "@/features/running/components/WeekdayPicker";
import {
  DEFAULT_RUN_DAYS,
  formatClock,
  formatRunDate,
  parseFinishTime,
  raceLabel,
  WEEKDAYS,
} from "@/features/running/copy";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";
import { spacing } from "@/theme/tokens";

const RECOMMENDED: Record<string, RunProgramSlug> = {
  starter: "couch-to-5k",
  builder: "5k-to-10k",
  racer: "10k-to-half",
  pro: "half-to-marathon",
};

const DAY_COUNTS = [2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} days` }));
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Monday on or after a date. */
function nextMonday(from: string): string {
  const offset = (7 - weekdayOf(from)) % 7;
  return addDays(from, offset);
}

function tryBuild(settings: RunSettings, intensity: number) {
  try {
    return { plan: buildRunPlan(settings, intensity), error: null };
  } catch (error) {
    return {
      plan: null,
      error: error instanceof RunPlanError ? error.message : toUserMessage(error),
    };
  }
}

/** Create or edit a running plan: programme, days, race date, units and goal time. */
export default function RunSetup() {
  const userId = useUserId();
  const plan = useRunPlan(userId);
  const level = useRunnerLevel(userId);
  const params = useLocalSearchParams<{ program?: string }>();

  if (plan.isPending || level.isPending) return <LoadingView />;
  if (plan.isError || level.isError) {
    return (
      <ErrorView
        message={toUserMessage(plan.error ?? level.error)}
        onRetry={() => void Promise.all([plan.refetch(), level.refetch()])}
      />
    );
  }
  const requested = RUN_PROGRAM_SLUGS.find((slug) => slug === params.program);
  const initialProgram =
    requested ??
    plan.data?.settings.program ??
    RECOMMENDED[level.data ?? "starter"] ??
    "couch-to-5k";
  return <SetupForm userId={userId} current={plan.data} initialProgram={initialProgram} />;
}

function SetupForm({
  userId,
  current,
  initialProgram,
}: {
  userId: string;
  current: ActiveRunPlan | null;
  initialProgram: RunProgramSlug;
}) {
  const save = useSaveRunPlan(userId);
  const today = localToday();
  const existing = current?.settings;

  const [program, setProgram] = useState<RunProgramSlug>(initialProgram);
  const [days, setDays] = useState(existing?.daysPerWeek ?? 3);
  const [runDays, setRunDays] = useState<Weekday[]>(
    existing ? [...existing.runDays] : (DEFAULT_RUN_DAYS[3] ?? [1, 3, 5]),
  );
  const [longRunDay, setLongRunDay] = useState<Weekday>(existing?.longRunDay ?? 5);
  const [start, setStart] = useState<"today" | "monday">("today");
  const [hasRace, setHasRace] = useState(!!existing?.raceDate);
  const [raceDate, setRaceDate] = useState(existing?.raceDate ?? "");
  const [units, setUnits] = useState<"km" | "mi">(existing?.units ?? "km");
  const [goalTime, setGoalTime] = useState(
    existing?.targetSeconds ? formatClock(existing.targetSeconds) : "",
  );

  const keepsPlan = !!existing && existing.program === program;
  const startDate = keepsPlan ? existing.startDate : start === "today" ? today : nextMonday(today);
  const targetSeconds = parseFinishTime(goalTime);
  const meta = getRunProgram(program);

  const settings: RunSettings = {
    program,
    daysPerWeek: days,
    runDays,
    longRunDay,
    startDate,
    raceDate: hasRace && ISO.test(raceDate) ? raceDate : null,
    units,
    targetSeconds,
  };

  // Field-level problems first, then whatever the plan builder rejects.
  const fieldError =
    runDays.length !== days
      ? `Pick ${days} run days (${runDays.length} selected).`
      : !runDays.includes(longRunDay)
        ? "Choose a long-run day from your run days."
        : hasRace && !ISO.test(raceDate)
          ? "Enter your race date as YYYY-MM-DD, e.g. 2027-03-14."
          : hasRace && raceDate <= today
            ? "Your race date needs to be in the future."
            : goalTime.trim() && targetSeconds === null
              ? "Enter a goal time like 28:00 or 1:55:00."
              : null;

  // Building a plan takes well under a millisecond, so it simply runs every render.
  const preview = fieldError ? null : tryBuild(settings, current?.intensity ?? 1);

  const changeDays = (n: number) => {
    setDays(n);
    setRunDays(DEFAULT_RUN_DAYS[n] ?? runDays);
    setLongRunDay(5);
  };
  const toggleDay = (day: Weekday) =>
    setRunDays((selected) =>
      selected.includes(day)
        ? selected.filter((d) => d !== day)
        : [...selected, day].sort((a, b) => a - b),
    );

  const error = fieldError ?? preview?.error ?? null;
  const zones = targetSeconds ? paceZones(meta.goalMeters, targetSeconds) : null;
  const last = preview?.plan?.sessions.at(-1);
  const first = preview?.plan?.sessions[0];

  return (
    <Screen
      footer={
        <>
          {save.isError ? <Banner message={toUserMessage(save.error)} /> : null}
          <Button
            label={keepsPlan ? "Save changes" : existing ? "Start new plan" : "Start my plan"}
            disabled={!!error || !preview?.plan}
            loading={save.isPending}
            onPress={() => save.mutate({ settings, current }, { onSuccess: () => router.back() })}
          />
        </>
      }
    >
      <BackButton variant="close" />
      <AppText variant="title" accessibilityRole="header">
        {existing ? "Your running plan" : "Build your running plan"}
      </AppText>

      <AppText variant="heading">Programme</AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {RUN_PROGRAM_SLUGS.map((slug) => {
          const p = getRunProgram(slug);
          return (
            <ChoiceCard
              key={slug}
              label={p.name}
              description={`${RUN_LEVEL_INFO[p.level].name} · ${p.description}`}
              selected={program === slug}
              onPress={() => setProgram(slug)}
            />
          );
        })}
      </View>
      {existing && !keepsPlan ? (
        <Banner
          tone="info"
          message="Switching programme starts a new plan. Your run history stays."
        />
      ) : null}

      <AppText variant="heading">Runs per week</AppText>
      <SegmentedControl
        options={DAY_COUNTS}
        value={String(days)}
        onChange={(v) => changeDays(Number(v))}
        accessibilityLabel="Runs per week"
      />
      {meta.mode === "sequence" && days > 3 ? (
        <AppText variant="caption" color="textMuted">
          New runners improve fastest with rest days, so days after the third become brisk recovery
          walks.
        </AppText>
      ) : null}
      <AppText variant="caption" color="textMuted">
        Run days (the dot is your long run)
      </AppText>
      <WeekdayPicker selected={runDays} onToggle={toggleDay} marked={longRunDay} label="Run days" />
      <AppText variant="caption" color="textMuted">
        Long-run day
      </AppText>
      <SegmentedControl
        options={runDays.map((d) => ({
          value: String(d),
          label: WEEKDAYS[d]?.long.slice(0, 3) ?? String(d),
        }))}
        value={String(longRunDay)}
        onChange={(v) => setLongRunDay(Number(v) as Weekday)}
        accessibilityLabel="Long-run day"
      />

      {!keepsPlan ? (
        <>
          <AppText variant="heading">Start</AppText>
          <SegmentedControl
            options={[
              { value: "today", label: "This week" },
              { value: "monday", label: "Next Monday" },
            ]}
            value={start}
            onChange={setStart}
            accessibilityLabel="Start date"
          />
        </>
      ) : null}

      <AppText variant="heading">Race day</AppText>
      <SegmentedControl
        options={[
          { value: "no", label: "No race" },
          { value: "yes", label: "I have a race" },
        ]}
        value={hasRace ? "yes" : "no"}
        onChange={(v) => setHasRace(v === "yes")}
        accessibilityLabel="Race day"
      />
      {hasRace ? (
        <TextField
          label="Race date"
          value={raceDate}
          onChangeText={setRaceDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
      ) : null}

      <AppText variant="heading">Goal time (optional)</AppText>
      <TextField
        label={`Finish time for your ${raceLabel(meta.goalMeters)}`}
        value={goalTime}
        onChangeText={setGoalTime}
        placeholder="e.g. 28:00 or 1:55:00"
        keyboardType="numbers-and-punctuation"
      />
      <SegmentedControl
        options={[
          { value: "km", label: "Kilometres" },
          { value: "mi", label: "Miles" },
        ]}
        value={units}
        onChange={setUnits}
        accessibilityLabel="Units"
      />

      {error ? <Banner message={error} /> : null}
      {preview?.plan && first && last ? (
        <Card>
          <AppText variant="overline" color="brand">
            Your plan
          </AppText>
          <AppText variant="heading">
            {preview.plan.weeks} weeks · {preview.plan.sessions.length} sessions
          </AppText>
          <AppText color="textMuted">
            First run {formatRunDate(first.date)} ({formatDuration(first.totalSeconds)}).{" "}
            {last.type === "race" ? `Race day ${formatRunDate(last.date)}.` : ""}
          </AppText>
          {zones ? (
            <>
              <AppText variant="caption" color="textMuted">
                Easy runs {formatPaceRange(zones.easy, units)}
              </AppText>
              <AppText variant="caption" color="textMuted">
                Tempo {formatPaceRange(zones.tempo, units)} · Intervals{" "}
                {formatPaceRange(zones.interval, units)}
              </AppText>
            </>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ options: { gap: spacing.md } });
