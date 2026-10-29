import {
  averageRunMet,
  estimateKcal,
  formatDuration,
  formatPaceRange,
  getRunProgram,
  METERS_PER_MILE,
  nextRunIntensity,
  paceZones,
  ZONE_FOR_SEGMENT,
  EFFORT_CUE,
  type RunEffort,
  type RunSegment,
  type RunSession,
} from "@goal4me/core";
import * as Crypto from "expo-crypto";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Button, Card, ChoiceCard, Screen, TextField } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useIsPremium } from "@/features/billing/api";
import { LockedCard } from "@/features/billing/components/LockedCard";
import { syncWorkoutToHealth } from "@/features/health/sync";
import { useHomeSummary } from "@/features/home/api";
import { useRunPlan, type ActiveRunPlan } from "@/features/running/api";
import { SegmentStrip } from "@/features/running/components/SegmentStrip";
import {
  EFFORT_OPTIONS,
  formatClock,
  formatRunDate,
  SEGMENT_COLOR,
  SEGMENT_LABEL,
  SESSION_LABEL,
} from "@/features/running/copy";
import { isRunLocked } from "@/features/running/gating";
import { activeMs } from "@/features/running/player/machine";
import { useRunPlayer } from "@/features/running/player/useRunPlayer";
import { flushRunQueue, useRunQueue } from "@/features/running/sync";
import { track } from "@/lib/analytics";
import { toUserMessage } from "@/lib/errors";
import { colors, radii, spacing } from "@/theme/tokens";

/** Used for the calorie estimate until the user has logged a weight. */
const DEFAULT_WEIGHT_KG = 70;
/** Runs shorter than this aren't saved (the database minimum). */
const MIN_RUN_SECONDS = 60;

/** A guided run: preview, the live player, then logging how it went. */
export default function RunScreen() {
  const { runNumber } = useLocalSearchParams<{ runNumber: string }>();
  const userId = useUserId();
  const plan = useRunPlan(userId);
  const isPremium = useIsPremium(userId);

  if (plan.isPending) return <LoadingView />;
  if (plan.isError) {
    return <ErrorView message={toUserMessage(plan.error)} onRetry={() => void plan.refetch()} />;
  }
  const session = plan.data?.plan?.sessions.find((s) => s.runNumber === Number(runNumber));
  if (!plan.data || !session) {
    return (
      <Screen>
        <BackButton variant="close" />
        <AppText variant="title">This run isn't in your plan</AppText>
        <AppText color="textMuted">
          Your plan may have changed. Pick a run from the Running tab.
        </AppText>
      </Screen>
    );
  }
  if (isRunLocked(session.runNumber, isPremium)) {
    return (
      <Screen>
        <BackButton variant="close" />
        <LockedCard
          reason="run"
          title="Keep your running going"
          message="Your first 3 runs are free. Premium unlocks every run in your plan, all running guides and every workout."
        />
      </Screen>
    );
  }
  return <RunFlow key={session.runNumber} userId={userId} active={plan.data} session={session} />;
}

function RunFlow({
  userId,
  active,
  session,
}: {
  userId: string;
  active: ActiveRunPlan;
  session: RunSession;
}) {
  const [phase, setPhase] = useState<"preview" | "running">("preview");
  if (phase === "preview") {
    return <Preview active={active} session={session} onStart={() => setPhase("running")} />;
  }
  return <Player userId={userId} active={active} session={session} />;
}

// --- Preview ---------------------------------------------------------------------

/** Consecutive identical segment pairs collapse into "8 × Run 1:00 / Walk 1:30". */
function describe(segments: readonly RunSegment[]): { label: string; segment: RunSegment }[] {
  const rows: { label: string; segment: RunSegment }[] = [];
  let i = 0;
  while (i < segments.length) {
    const a = segments[i];
    const b = segments[i + 1];
    if (!a) break;
    let reps = 1;
    if (b && a.kind !== b.kind) {
      while (
        segments[i + reps * 2]?.kind === a.kind &&
        segments[i + reps * 2]?.seconds === a.seconds &&
        segments[i + reps * 2 + 1]?.kind === b.kind &&
        segments[i + reps * 2 + 1]?.seconds === b.seconds
      ) {
        reps++;
      }
    }
    if (reps > 1 && b) {
      rows.push({
        label: `${reps} × ${SEGMENT_LABEL[a.kind]} ${formatDuration(a.seconds)} / ${SEGMENT_LABEL[b.kind].toLowerCase()} ${formatDuration(b.seconds)}`,
        segment: a,
      });
      i += reps * 2;
    } else {
      rows.push({
        label: `${SEGMENT_LABEL[a.kind]} ${a.open ? `(about ${formatDuration(a.seconds)})` : formatDuration(a.seconds)}`,
        segment: a,
      });
      i += 1;
    }
  }
  return rows;
}

function Preview({
  active,
  session,
  onStart,
}: {
  active: ActiveRunPlan;
  session: RunSession;
  onStart: () => void;
}) {
  const { settings } = active;
  const program = getRunProgram(settings.program);
  const zones = settings.targetSeconds
    ? paceZones(program.goalMeters, settings.targetSeconds)
    : null;

  return (
    <Screen footer={<Button label="Start run" onPress={onStart} />}>
      <BackButton variant="close" />
      <AppText variant="overline" color="brand">
        {program.name} · Run {session.runNumber}
      </AppText>
      <AppText variant="title" accessibilityRole="header">
        {session.title}
      </AppText>
      <AppText color="textMuted">
        {formatRunDate(session.date)} · {SESSION_LABEL[session.type]} ·{" "}
        {formatDuration(session.totalSeconds)}
      </AppText>
      <SegmentStrip segments={session.segments} height={14} />
      <Card>
        {describe(session.segments).map(({ label, segment }, i) => {
          const zone = ZONE_FOR_SEGMENT[segment.kind];
          return (
            <View key={i} style={styles.segmentRow}>
              <View
                style={[styles.swatch, { backgroundColor: colors[SEGMENT_COLOR[segment.kind]] }]}
              />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{label}</AppText>
                <AppText variant="caption" color="textMuted">
                  {zones && zone
                    ? formatPaceRange(zones[zone], settings.units)
                    : EFFORT_CUE[segment.kind]}
                </AppText>
              </View>
            </View>
          );
        })}
      </Card>
      <AppText variant="caption" color="textMuted">
        Voice cues tell you when to change pace, so you can keep your phone in your pocket. Keep the
        app open on screen for the cues.
      </AppText>
    </Screen>
  );
}

// --- Player --------------------------------------------------------------------------

function Player({
  userId,
  active,
  session,
}: {
  userId: string;
  active: ActiveRunPlan;
  session: RunSession;
}) {
  useKeepAwake();
  const [voice, setVoice] = useState(true);
  const { state, position, dispatch } = useRunPlayer(session.segments, voice);
  // The runner already tapped "Start run" on the preview.
  useEffect(() => dispatch("start"), [dispatch]);
  // When the last segment ends, finish (the machine caps the time at the plan's end).
  useEffect(() => {
    if (position.complete && state.status === "running") dispatch("finish");
  }, [position.complete, state.status, dispatch]);

  if (state.status === "finished") {
    return (
      <Finished
        userId={userId}
        active={active}
        session={session}
        startedAt={new Date(state.startedAt ?? Date.now()).toISOString()}
        durationSec={Math.round(activeMs(state, Date.now()) / 1000)}
      />
    );
  }

  const segment = session.segments[position.index];
  const next = session.segments[position.index + 1];
  const paused = state.status === "paused";

  const end = () => {
    const finish = () => dispatch("finish");
    const message =
      position.elapsed < MIN_RUN_SECONDS
        ? "Runs under a minute aren't saved."
        : "You can still save what you ran.";
    if (Platform.OS === "web") {
      if (window.confirm(`End run? ${message}`)) {
        if (position.elapsed < MIN_RUN_SECONDS) router.back();
        else finish();
      }
      return;
    }
    Alert.alert("End run?", message, [
      { text: "Keep going", style: "cancel" },
      {
        text: "End run",
        style: "destructive",
        onPress: () => (position.elapsed < MIN_RUN_SECONDS ? router.back() : finish()),
      },
    ]);
  };

  return (
    <Screen
      scroll={false}
      footer={
        <View style={styles.controls}>
          <Button label="End" variant="ghost" style={styles.side} onPress={end} />
          <Button
            label={paused ? "Resume" : "Pause"}
            style={styles.main}
            onPress={() => dispatch(paused ? "resume" : "pause")}
          />
          <Button
            label={segment?.open ? "Finish" : "Skip"}
            variant="secondary"
            style={styles.side}
            onPress={() => dispatch("skip")}
          />
        </View>
      }
    >
      <View style={styles.topRow}>
        <AppText variant="caption" color="textMuted" style={styles.flex}>
          {session.title}
        </AppText>
        <Pressable
          onPress={() => setVoice((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: voice }}
          accessibilityLabel="Voice cues"
          hitSlop={12}
        >
          <AppText variant="caption" color={voice ? "brand" : "textSubtle"}>
            {voice ? "Voice on" : "Voice off"}
          </AppText>
        </Pressable>
      </View>
      <SegmentStrip segments={session.segments} current={position.index} height={8} />
      {segment ? (
        <View style={styles.center} accessibilityLiveRegion="polite">
          <View style={[styles.badge, { borderColor: colors[SEGMENT_COLOR[segment.kind]] }]}>
            <AppText variant="overline" color={SEGMENT_COLOR[segment.kind]}>
              {paused ? "Paused" : SEGMENT_LABEL[segment.kind]}
            </AppText>
          </View>
          <AppText style={styles.clock} accessibilityRole="timer">
            {formatClock(position.remaining ?? position.inSegment)}
          </AppText>
          <AppText color="textMuted" align="center">
            {segment.open ? "Tap Finish when you cross the line" : EFFORT_CUE[segment.kind]}
          </AppText>
          {next ? (
            <AppText variant="caption" color="textSubtle">
              Next: {SEGMENT_LABEL[next.kind]} {next.open ? "" : formatDuration(next.seconds)}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={styles.totals}>
        <AppText variant="caption" color="textMuted">
          Time {formatClock(position.elapsed)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          Segment {Math.min(position.index + 1, session.segments.length)} of{" "}
          {session.segments.length}
        </AppText>
      </View>
    </Screen>
  );
}

// --- Finish and log -------------------------------------------------------------------

function Finished({
  userId,
  active,
  session,
  startedAt,
  durationSec,
}: {
  userId: string;
  active: ActiveRunPlan;
  session: RunSession;
  startedAt: string;
  durationSec: number;
}) {
  const summary = useHomeSummary(userId);
  const enqueue = useRunQueue((s) => s.enqueue);
  const sessionId = useRef(Crypto.randomUUID());
  const stillQueued = useRunQueue((s) => s.pending.some((p) => p.sessionId === sessionId.current));
  const [effort, setEffort] = useState<RunEffort | null>(null);
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const { units } = active.settings;

  const seconds = Math.max(MIN_RUN_SECONDS, durationSec);
  const kcal = Math.min(
    5000,
    estimateKcal({
      met: averageRunMet(session.segments),
      weightKg: summary.data?.weights[0]?.weightKg ?? DEFAULT_WEIGHT_KG,
      durationSec: seconds,
    }),
  );
  const distanceValue = distance.trim() ? Number(distance.replace(",", ".")) : null;
  const distanceError =
    distanceValue !== null &&
    (!Number.isFinite(distanceValue) || distanceValue < 0 || distanceValue > 100)
      ? `Enter a distance between 0 and 100 ${units}`
      : undefined;
  const distanceM =
    distanceValue === null || distanceError
      ? null
      : Math.round(distanceValue * (units === "km" ? 1000 : METERS_PER_MILE));

  const save = () => {
    if (!effort || distanceError) return;
    // Queue first (survives being offline or the app closing), then try to send.
    enqueue({
      sessionId: sessionId.current,
      userId,
      planId: active.id,
      runNumber: session.runNumber,
      week: session.week,
      startedAt,
      durationSec: seconds,
      distanceM,
      effort,
      notes: notes.trim() ? notes.trim().slice(0, 500) : null,
      nextIntensity: nextRunIntensity(active.intensity, effort),
    });
    void flushRunQueue(userId);
    syncWorkoutToHealth({
      id: sessionId.current,
      startedAt,
      durationSec: seconds,
      kcal,
      activity: "running",
    });
    track("run_completed", { program: active.settings.program, run: session.runNumber, effort });
    setSaved(true);
  };

  return (
    <Screen
      footer={
        saved ? (
          <Button label="Done" onPress={() => router.back()} />
        ) : (
          <Button label="Save run" disabled={!effort || !!distanceError} onPress={save} />
        )
      }
    >
      <View style={styles.finishedHeader}>
        <AppText variant="overline" color="brand">
          Run {session.runNumber} complete
        </AppText>
        <AppText variant="title">{saved ? "Saved. Great running!" : "You did it!"}</AppText>
      </View>
      <View style={styles.stats}>
        <Stat value={formatClock(seconds)} label="time" />
        <Stat value={String(kcal)} label="kcal (est.)" />
      </View>
      {saved ? (
        <AppText color="textMuted">
          {stillQueued
            ? "Saved on this phone. Your plan and streak will update as soon as you're online."
            : "Your plan and streak are up to date. Rest well before your next run."}
        </AppText>
      ) : (
        <>
          <TextField
            label={`Distance (${units}, optional)`}
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            suffix={units}
            error={distanceError}
          />
          <AppText variant="heading">How did it feel?</AppText>
          <View style={styles.options} accessibilityRole="radiogroup">
            {EFFORT_OPTIONS.map((o) => (
              <ChoiceCard
                key={o.value}
                label={o.label}
                description={o.description}
                selected={effort === o.value}
                onPress={() => setEffort(o.value)}
              />
            ))}
          </View>
          <AppText variant="caption" color="textMuted">
            Your next runs adjust a little: longer if it felt easy, shorter if it was hard.
          </AppText>
          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            maxLength={500}
          />
        </>
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
  flex: { flex: 1 },
  segmentRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  swatch: { width: 10, height: 32, borderRadius: radii.sm },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  badge: {
    borderWidth: 2,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  clock: { fontSize: 88, lineHeight: 96, fontWeight: "800", fontVariant: ["tabular-nums"] },
  totals: { flexDirection: "row", justifyContent: "space-between" },
  controls: { flexDirection: "row", gap: spacing.sm },
  side: { flex: 1, paddingHorizontal: spacing.sm },
  main: { flex: 1.4 },
  finishedHeader: { gap: spacing.sm, paddingTop: spacing.xl },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center" },
  options: { gap: spacing.md },
});
