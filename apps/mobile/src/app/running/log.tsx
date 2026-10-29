import { addDays, formatPace, paceSecPerKm, type WorkoutRating } from "@goal4me/core";
import { runLogSchema } from "@goal4me/schemas";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { useHomeSummary } from "@/features/home/api";
import type { Units } from "@/features/onboarding/steps";
import {
  planWeeks,
  useLogRun,
  useRunningPlan,
  useUndoRun,
  type RunLog,
  type RunningPlan,
} from "@/features/running/api";
import { SESSION_LABEL } from "@/features/running/guide";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";

const KM_PER_MILE = 1.609344;

const RATINGS: { value: WorkoutRating; label: string; description: string }[] = [
  { value: "too_easy", label: "Too easy", description: "I could have done much more" },
  { value: "just_right", label: "Just right", description: "Challenging but doable" },
  { value: "too_hard", label: "Too hard", description: "I struggled or had to stop a lot" },
];

/** Log (or edit) one planned run: `?week=N&session=I`. */
export default function LogRun() {
  const userId = useUserId();
  const params = useLocalSearchParams<{ week: string; session: string }>();
  const plan = useRunningPlan(userId);
  const summary = useHomeSummary(userId);

  if (plan.isPending || summary.isPending) return <LoadingView />;
  if (plan.isError || summary.isError) {
    return (
      <ErrorView
        message={toUserMessage(plan.error ?? summary.error)}
        onRetry={() => void Promise.all([plan.refetch(), summary.refetch()])}
      />
    );
  }
  const week = Number(params.week);
  const sessionIndex = Number(params.session);
  const session = plan.data ? planWeeks(plan.data)[week - 1]?.sessions[sessionIndex] : undefined;
  if (!plan.data || !session) {
    return (
      <ErrorView message="This run isn't in your current plan." onRetry={() => router.back()} />
    );
  }
  const existing = plan.data.logs.find((l) => l.week === week && l.sessionIndex === sessionIndex);
  return (
    <LogForm
      userId={userId}
      plan={plan.data}
      week={week}
      sessionIndex={sessionIndex}
      sessionMinutes={session.minutes}
      title={`Week ${week} · ${SESSION_LABEL[session.type]}`}
      description={session.description}
      existing={existing}
      units={summary.data.profile.units}
    />
  );
}

function LogForm(props: {
  userId: string;
  plan: RunningPlan;
  week: number;
  sessionIndex: number;
  sessionMinutes: number;
  title: string;
  description: string;
  existing: RunLog | undefined;
  units: Units;
}) {
  const { existing, units } = props;
  const log = useLogRun(props.userId);
  const undo = useUndoRun(props.userId);
  const today = localToday();
  const [day, setDay] = useState<"today" | "yesterday">(
    existing?.completedOn === addDays(today, -1) ? "yesterday" : "today",
  );
  const [minutes, setMinutes] = useState(String(existing?.minutes ?? props.sessionMinutes));
  const [distance, setDistance] = useState(() => {
    if (existing?.distanceKm == null) return "";
    const value = units === "imperial" ? existing.distanceKm / KM_PER_MILE : existing.distanceKm;
    return String(Math.round(value * 100) / 100);
  });
  const [rating, setRating] = useState<WorkoutRating>(existing?.rating ?? "just_right");
  const [errors, setErrors] = useState<{ minutes?: string; distance?: string }>({});

  const distanceValue = distance.trim() === "" ? undefined : Number(distance.replace(",", "."));
  const distanceKm =
    distanceValue === undefined
      ? undefined
      : units === "imperial"
        ? distanceValue * KM_PER_MILE
        : distanceValue;
  const minutesValue = minutes.trim() === "" ? undefined : Number(minutes);
  const pace = distanceKm && minutesValue ? paceSecPerKm(distanceKm, minutesValue * 60) : null;
  const unit = units === "imperial" ? "mi" : "km";

  const submit = () => {
    const parsed = runLogSchema.safeParse({
      planId: props.plan.id,
      week: props.week,
      sessionIndex: props.sessionIndex,
      completedOn: day === "today" ? today : addDays(today, -1),
      minutes: minutesValue,
      distanceKm,
      rating,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "minutes") next.minutes ??= "Enter your time in whole minutes";
        if (issue.path[0] === "distanceKm") next.distance ??= "Enter a distance, e.g. 5.2";
      }
      setErrors(next);
      return;
    }
    setErrors({});
    log.mutate(parsed.data, { onSuccess: () => router.back() });
  };

  return (
    <Screen
      footer={
        <>
          <Button
            label={existing ? "Save changes" : "Log run"}
            loading={log.isPending}
            onPress={submit}
          />
          {existing ? (
            <Button
              label="Undo: mark as not done"
              variant="ghost"
              loading={undo.isPending}
              onPress={() =>
                undo.mutate(
                  { planId: props.plan.id, week: props.week, sessionIndex: props.sessionIndex },
                  { onSuccess: () => router.back() },
                )
              }
            />
          ) : null}
        </>
      }
    >
      <BackButton variant="close" />
      <AppText variant="title" accessibilityRole="header">
        {props.title}
      </AppText>
      <Card>
        <AppText variant="overline" color="brand">
          The plan
        </AppText>
        <AppText>{props.description}</AppText>
      </Card>
      {log.isError || undo.isError ? (
        <Banner message={toUserMessage(log.error ?? undo.error)} />
      ) : null}
      <SegmentedControl
        options={[
          { value: "today", label: "Today" },
          { value: "yesterday", label: "Yesterday" },
        ]}
        value={day}
        onChange={setDay}
        accessibilityLabel="When did you run?"
      />
      <TextField
        label="Time"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
        suffix="min"
        error={errors.minutes}
      />
      <TextField
        label="Distance (optional)"
        value={distance}
        onChangeText={setDistance}
        keyboardType="decimal-pad"
        suffix={unit}
        error={errors.distance}
      />
      {pace ? (
        <AppText variant="caption" color="textMuted">
          Average pace:{" "}
          {units === "imperial"
            ? formatPace(pace * KM_PER_MILE).replace("/km", "/mi")
            : formatPace(pace)}
        </AppText>
      ) : null}
      <AppText variant="heading">How did it feel?</AppText>
      {RATINGS.map((r) => (
        <ChoiceCard
          key={r.value}
          label={r.label}
          description={r.description}
          selected={rating === r.value}
          onPress={() => setRating(r.value)}
        />
      ))}
    </Screen>
  );
}
