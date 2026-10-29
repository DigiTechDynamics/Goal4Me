import {
  averageMet,
  buildWorkout,
  estimateKcal,
  nextIntensityFactor,
  type WorkoutRating,
} from "@goal4me/core";
import * as Crypto from "expo-crypto";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Button, Card, ProgressBar, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { LockedCard } from "@/features/billing/components/LockedCard";
import { useDayLocks } from "@/features/billing/gating";
import { useHomeSummary } from "@/features/home/api";
import { useExerciseLibrary, useProgramDay, useProgramPlan } from "@/features/workouts/api";
import { CountdownRing } from "@/features/workouts/components/CountdownRing";
import { ExerciseVisual } from "@/features/workouts/components/ExerciseVisual";
import { RatingView } from "@/features/workouts/components/RatingView";
import {
  exercisesReached,
  GET_READY_SECONDS,
  progressOf,
} from "@/features/workouts/player/machine";
import { usePlayer } from "@/features/workouts/player/usePlayer";
import { flushWorkoutQueue, useSyncQueue } from "@/features/workouts/syncQueue";
import { toUserMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";

/** Fallback body weight for the calorie estimate if no weigh-in is cached. */
const DEFAULT_WEIGHT_KG = 70;

/** Full-screen guided workout for one programme day. */
export default function WorkoutScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const userId = useUserId();
  const library = useExerciseLibrary();
  const plan = useProgramPlan(userId);
  const day = useProgramDay(dayId);
  const locks = useDayLocks(userId, plan.data);
  const planDay = plan.data?.days.find((d) => d.id === dayId);
  const locked = !!planDay && locks.isLocked(planDay);

  const workout = useMemo(() => {
    if (!library.data || !plan.data || !day.data) return null;
    return buildWorkout({
      items: day.data.items,
      library: new Map(Object.entries(library.data.byId)),
      limitations: plan.data.limitations,
      level: plan.data.fitnessLevel,
      intensityFactor: plan.data.intensityFactor,
      minutesPerSession: plan.data.minutesPerSession,
      fallbacks: library.data.fallbackIds,
    });
  }, [library.data, plan.data, day.data]);

  const failed = library.error ?? plan.error ?? day.error;
  if (failed) {
    return (
      <ErrorView
        message={toUserMessage(failed)}
        onRetry={() => {
          void library.refetch();
          void plan.refetch();
          void day.refetch();
        }}
      />
    );
  }
  if (!locks.ready || !plan.data) return <LoadingView label="Preparing your workout" />;
  // The database also hides locked days' exercises, so an empty premium day means locked.
  if (locked || (plan.data.programIsPremium && day.data?.items.length === 0 && !locks.isPremium)) {
    return (
      <Screen>
        <BackButton variant="close" />
        <LockedCard
          reason="workout"
          title={planDay ? `Day ${planDay.dayNumber} is a Premium workout` : "Premium workout"}
          message="You've done your free workouts. Go Premium to unlock every day of your plan, adapted as you get stronger."
        />
      </Screen>
    );
  }
  if (!workout || !day.data) return <LoadingView label="Preparing your workout" />;
  if (workout.steps.length === 0) {
    return (
      <ErrorView
        message="This workout has no exercises you can do safely."
        onRetry={() => router.back()}
      />
    );
  }

  return (
    <Player
      userId={userId}
      dayId={dayId}
      title={day.data.title}
      workout={workout}
      intensityFactor={plan.data.intensityFactor}
      recentRatings={plan.data.recentRatings}
    />
  );
}

function Player({
  userId,
  dayId,
  title,
  workout,
  intensityFactor,
  recentRatings,
}: {
  userId: string;
  dayId: string;
  title: string;
  workout: ReturnType<typeof buildWorkout>;
  intensityFactor: number;
  recentRatings: WorkoutRating[];
}) {
  useKeepAwake();
  const [voice, setVoice] = useState(true);
  const { state, dispatch } = usePlayer(workout.steps, voice);
  const startedAt = useRef(new Date().toISOString());
  const summary = useHomeSummary(userId);

  const step = workout.steps[state.index];
  const nextExercise = workout.steps.slice(state.index + 1).find((s) => s.kind === "exercise");

  const quit = () => {
    const leave = () => router.back();
    const message = "Your progress in this workout won't be saved.";
    if (Platform.OS === "web") {
      if (window.confirm(`End workout? ${message}`)) leave();
      return;
    }
    dispatch({ type: "pause" });
    Alert.alert("End workout?", message, [
      { text: "Keep going", style: "cancel", onPress: () => dispatch({ type: "resume" }) },
      { text: "End", style: "destructive", onPress: leave },
    ]);
  };

  if (state.status === "finished") {
    return (
      <Finished
        userId={userId}
        dayId={dayId}
        startedAt={startedAt.current}
        durationSec={Math.max(1, state.elapsed)}
        kcal={estimateKcal({
          met: averageMet(workout.steps),
          weightKg: summary.data?.weights[0]?.weightKg ?? DEFAULT_WEIGHT_KG,
          durationSec: Math.max(1, state.elapsed),
        })}
        moves={exercisesReached(state, workout.steps)}
        intensityFactor={intensityFactor}
        recentRatings={recentRatings}
      />
    );
  }

  return (
    <Screen
      footer={
        <View style={styles.controls}>
          <Button
            label="Back"
            variant="secondary"
            style={styles.side}
            disabled={state.status === "ready" || state.index === 0}
            onPress={() => dispatch({ type: "previous" })}
          />
          {state.status === "paused" ? (
            <Button
              label="Resume"
              style={styles.main}
              onPress={() => dispatch({ type: "resume" })}
            />
          ) : step?.kind === "exercise" &&
            state.remaining === null &&
            state.status === "running" ? (
            <Button label="Done" style={styles.main} onPress={() => dispatch({ type: "next" })} />
          ) : (
            <Button
              label="Pause"
              variant="secondary"
              style={styles.main}
              onPress={() => dispatch({ type: "pause" })}
            />
          )}
          <Button
            label={step?.kind === "rest" ? "Skip" : "Next"}
            variant="secondary"
            style={styles.side}
            onPress={() => dispatch({ type: "next" })}
          />
        </View>
      }
    >
      <View style={styles.header}>
        <Pressable
          onPress={quit}
          accessibilityRole="button"
          accessibilityLabel="End workout"
          hitSlop={16}
        >
          <AppText variant="heading">✕</AppText>
        </Pressable>
        <View style={styles.progress}>
          <ProgressBar value={progressOf(state, workout.steps)} />
        </View>
        <Pressable
          onPress={() => setVoice((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: voice }}
          accessibilityLabel="Voice cues"
          hitSlop={16}
        >
          <AppText variant="caption" color={voice ? "brand" : "textSubtle"}>
            {voice ? "Voice on" : "Voice off"}
          </AppText>
        </Pressable>
      </View>

      {state.status === "ready" ? (
        <View style={styles.center}>
          <AppText variant="overline" color="brand">
            {title}
          </AppText>
          <CountdownRing
            remaining={state.remaining ?? 0}
            total={GET_READY_SECONDS}
            label="Get ready"
          />
          {workout.steps[0]?.kind === "exercise" ? (
            <AppText variant="heading" align="center">
              First up: {workout.steps[0].exercise.name}
            </AppText>
          ) : null}
        </View>
      ) : step?.kind === "rest" ? (
        <View style={styles.center}>
          <AppText variant="overline" color="info">
            Rest
          </AppText>
          <CountdownRing
            remaining={state.remaining ?? 0}
            total={step.seconds}
            label="seconds"
            tone="info"
          />
          <AppText color="textMuted">Next: {step.next.name}</AppText>
          <Button
            label="+15 seconds"
            variant="ghost"
            onPress={() => dispatch({ type: "extendRest" })}
          />
        </View>
      ) : step?.kind === "exercise" ? (
        <View style={styles.exercise}>
          <ExerciseVisual exercise={step.exercise} />
          <View style={styles.meta}>
            <AppText variant="overline" color="textMuted">
              {step.phase === "main"
                ? `Round ${step.round} of ${step.totalRounds}`
                : step.phase === "warmup"
                  ? "Warm-up"
                  : "Cool-down"}
            </AppText>
            <AppText variant="title" accessibilityRole="header">
              {step.exercise.name}
            </AppText>
            {step.substituted ? (
              <AppText variant="caption" color="info">
                Swapped in to suit you
              </AppText>
            ) : null}
          </View>
          {state.remaining !== null ? (
            <AppText variant="display" color="brand" accessibilityRole="timer">
              0:{String(state.remaining).padStart(2, "0")}
            </AppText>
          ) : (
            <AppText variant="display" color="brand">
              × {step.reps}
            </AppText>
          )}
          {step.exercise.formTips.slice(0, 2).map((tip) => (
            <AppText key={tip} variant="caption" color="textMuted">
              • {tip}
            </AppText>
          ))}
          {nextExercise?.kind === "exercise" ? (
            <AppText variant="caption" color="textSubtle">
              Next: {nextExercise.exercise.name}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {state.status === "paused" ? (
        <Card style={styles.paused}>
          <AppText variant="heading" align="center">
            Paused
          </AppText>
          <Button label="End workout" variant="ghost" onPress={quit} />
        </Card>
      ) : null}
    </Screen>
  );
}

function Finished(props: {
  userId: string;
  dayId: string;
  startedAt: string;
  durationSec: number;
  kcal: number;
  moves: number;
  intensityFactor: number;
  recentRatings: WorkoutRating[];
}) {
  const [rating, setRating] = useState<WorkoutRating | null>(null);
  const [saved, setSaved] = useState(false);
  const enqueue = useSyncQueue((s) => s.enqueue);
  const sessionId = useRef(Crypto.randomUUID());
  const stillQueued = useSyncQueue((s) => s.pending.some((p) => p.sessionId === sessionId.current));

  const save = () => {
    if (!rating) return;
    // Queue first (survives being offline or the app closing), then try to send.
    enqueue({
      sessionId: sessionId.current,
      userId: props.userId,
      programDayId: props.dayId,
      startedAt: props.startedAt,
      durationSec: props.durationSec,
      kcalEstimate: Math.min(5000, props.kcal),
      rating,
      nextIntensity: nextIntensityFactor(props.intensityFactor, [...props.recentRatings, rating]),
    });
    void flushWorkoutQueue(props.userId);
    setSaved(true);
  };

  const minutes = Math.max(1, Math.round(props.durationSec / 60));

  return (
    <Screen
      footer={
        saved ? (
          <Button label="Done" onPress={() => router.back()} />
        ) : (
          <Button label="Save workout" disabled={!rating} onPress={save} />
        )
      }
    >
      <View style={styles.finishedHeader}>
        <AppText variant="overline" color="brand">
          Workout complete
        </AppText>
        <AppText variant="title">{saved ? "Saved. Great work!" : "You did it!"}</AppText>
      </View>
      <View style={styles.stats}>
        <Stat value={String(minutes)} label="minutes" />
        <Stat value={String(props.kcal)} label="kcal (est.)" />
        <Stat value={String(props.moves)} label="moves" />
      </View>
      {saved ? (
        <AppText color="textMuted">
          {stillQueued
            ? "Saved on this phone. Your streak and programme will update as soon as you're online."
            : "Your streak and programme are up to date. Rest up and come back for your next workout."}
        </AppText>
      ) : (
        <RatingView value={rating} onChange={setRating} />
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <AppText variant="title" color="brand">
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  progress: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    paddingVertical: spacing.xl,
  },
  exercise: { gap: spacing.md, alignItems: "flex-start" },
  meta: { gap: spacing.xs },
  controls: { flexDirection: "row", gap: spacing.sm },
  side: { flex: 1, paddingHorizontal: spacing.sm },
  main: { flex: 1.4 },
  paused: { borderColor: colors.warning },
  finishedHeader: { gap: spacing.sm, paddingTop: spacing.xl },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center" },
});
