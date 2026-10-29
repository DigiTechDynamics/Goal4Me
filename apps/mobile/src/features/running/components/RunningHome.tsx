import {
  formatDistance,
  formatDuration,
  getRunProgram,
  nextRunSession,
  RUN_LEVEL_INFO,
} from "@goal4me/core";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Button, Card, ProgressBar } from "@/components/ui";
import { useIsPremium } from "@/features/billing/api";
import { toUserMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";
import {
  useRunGuides,
  useRunHistory,
  useRunnerLevel,
  useRunPlan,
  type ActiveRunPlan,
} from "../api";
import { formatRunDate, SESSION_LABEL } from "../copy";
import { isRunLocked, openRun, runSessionState } from "../gating";
import { LevelLadder } from "./LevelLadder";
import { SegmentStrip } from "./SegmentStrip";
import { SessionRow } from "./SessionRow";

/**
 * The Running side of the Workouts tab: the next run, this week, the
 * novice-to-pro ladder and guides. New runners start with the level quiz.
 */
export function RunningHome({ userId }: { userId: string }) {
  const level = useRunnerLevel(userId);
  const plan = useRunPlan(userId);
  const history = useRunHistory(userId);
  const isPremium = useIsPremium(userId);

  if (level.isPending || plan.isPending) return <LoadingView />;
  if (level.isError || plan.isError) {
    return (
      <ErrorView
        message={toUserMessage(level.error ?? plan.error)}
        onRetry={() => void Promise.all([level.refetch(), plan.refetch()])}
      />
    );
  }

  return (
    <>
      {plan.data?.plan ? (
        <PlanCards active={plan.data} isPremium={isPremium} />
      ) : (
        <Card>
          <AppText variant="overline" color="brand">
            Become a runner
          </AppText>
          <AppText variant="heading">From your first run to your first marathon</AppText>
          <AppText color="textMuted">
            {level.data
              ? "Pick a programme and the days that suit you. We'll build your plan week by week."
              : "Answer two quick questions to find your level, then get a plan built around your week."}
          </AppText>
          <Button
            label={level.data ? "Build my running plan" : "Find my level"}
            onPress={() => router.push(level.data ? "/running/setup" : "/running/level")}
          />
        </Card>
      )}

      {history.data && history.data.totalRuns > 0 ? (
        <Card>
          <AppText variant="overline" color="textMuted">
            Last 7 days
          </AppText>
          <View style={styles.stats}>
            <Stat value={String(history.data.week.runs)} label="runs" />
            <Stat value={formatDuration(history.data.week.seconds)} label="running" />
            <Stat
              value={
                history.data.week.meters
                  ? formatDistance(history.data.week.meters, plan.data?.settings.units ?? "km")
                  : "–"
              }
              label="distance"
            />
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={styles.header}>
          <AppText variant="heading" style={styles.flex}>
            Novice to pro
          </AppText>
          <Pressable
            onPress={() => router.push("/running/level")}
            accessibilityRole="button"
            hitSlop={8}
          >
            <AppText variant="caption" color="brand">
              {level.data ? "Retake quiz" : "Find my level"}
            </AppText>
          </Pressable>
        </View>
        <LevelLadder level={level.data} />
      </Card>

      <GuidesCard userId={userId} />
    </>
  );
}

function PlanCards({ active, isPremium }: { active: ActiveRunPlan; isPremium: boolean }) {
  const plan = active.plan;
  if (!plan) return null;
  const program = getRunProgram(active.settings.program);
  const next = nextRunSession(plan, active.completedRuns);
  const total = plan.sessions.length;
  const thisWeek = next ? plan.sessions.filter((s) => s.week === next.week) : [];
  const locked = next ? isRunLocked(next.runNumber, isPremium) : false;

  return (
    <>
      <Card>
        <AppText variant="overline" color="brand">
          {program.name}
        </AppText>
        {next ? (
          <>
            <AppText variant="heading">{next.title}</AppText>
            <AppText color="textMuted">
              {formatRunDate(next.date)} · {SESSION_LABEL[next.type]} ·{" "}
              {formatDuration(next.totalSeconds)}
            </AppText>
            <SegmentStrip segments={next.segments} />
            {locked ? (
              <AppText variant="caption" color="brand">
                You've done your free runs. Premium unlocks the rest of your plan.
              </AppText>
            ) : null}
            <Button
              label={locked ? "Unlock with Premium" : "Start run"}
              onPress={() => openRun(next.runNumber, isPremium)}
            />
          </>
        ) : (
          <>
            <AppText variant="heading">Plan complete!</AppText>
            <AppText color="textMuted">{program.goal}: done. Time for your next challenge.</AppText>
            <Button label="Choose my next plan" onPress={() => router.push("/running/setup")} />
          </>
        )}
        <ProgressBar value={active.completedRuns / total} />
        <AppText variant="caption" color="textMuted">
          {Math.min(active.completedRuns, total)} of {total} runs · {plan.weeks} weeks
        </AppText>
      </Card>

      {thisWeek.length ? (
        <Card>
          <View style={styles.header}>
            <AppText variant="heading" style={styles.flex}>
              Week {next?.week} of {plan.weeks}
            </AppText>
            <Pressable
              onPress={() => router.push("/running/plan")}
              accessibilityRole="button"
              hitSlop={8}
            >
              <AppText variant="caption" color="brand">
                Full plan
              </AppText>
            </Pressable>
          </View>
          {thisWeek.map((session) => (
            <SessionRow
              key={session.runNumber}
              session={session}
              state={runSessionState(session.runNumber, active.completedRuns, isPremium)}
              onPress={() => openRun(session.runNumber, isPremium)}
            />
          ))}
          <Button
            label="Edit my plan"
            variant="ghost"
            onPress={() => router.push("/running/setup")}
          />
        </Card>
      ) : null}
    </>
  );
}

function GuidesCard({ userId }: { userId: string }) {
  const guides = useRunGuides(userId);
  const level = useRunnerLevel(userId);
  if (!guides.data?.length) return null;
  // Lead with the guides for the runner's own level.
  const mine = guides.data.filter((g) => g.level === (level.data ?? "starter")).slice(0, 3);
  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading" style={styles.flex}>
          Running guides
        </AppText>
        <Pressable
          onPress={() => router.push("/running/guides")}
          accessibilityRole="button"
          hitSlop={8}
        >
          <AppText variant="caption" color="brand">
            All {guides.data.length}
          </AppText>
        </Pressable>
      </View>
      <AppText variant="caption" color="textMuted">
        {RUN_LEVEL_INFO[level.data ?? "starter"].name} tips
      </AppText>
      {mine.map((guide) => (
        <Pressable
          key={guide.id}
          style={styles.guide}
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/running/guide/[slug]", params: { slug: guide.slug } })
          }
        >
          <AppText style={styles.flex}>{guide.title}</AppText>
          <AppText color="textSubtle">›</AppText>
        </Pressable>
      ))}
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  guide: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
