import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { NeedsPlan } from "@/features/home/NeedsPlan";
import { nextWorkoutDay, useProgramPlan } from "@/features/workouts/api";
import { ProgramCalendar } from "@/features/workouts/components/ProgramCalendar";
import { toUserMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";

/** Workouts tab: the programme calendar and the next workout. */
export default function Workouts() {
  const userId = useUserId();
  const plan = useProgramPlan(userId);

  if (plan.isPending) return <LoadingView />;
  if (plan.isError)
    return <ErrorView message={toUserMessage(plan.error)} onRetry={() => void plan.refetch()} />;

  const data = plan.data;
  const next = data ? nextWorkoutDay(data) : null;
  const open = (dayId: string) => router.push({ pathname: "/workout/[dayId]", params: { dayId } });

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        Workouts
      </AppText>
      {!data ? (
        <NeedsPlan />
      ) : (
        <>
          <Card>
            <AppText variant="overline" color="brand">
              {data.programName}
            </AppText>
            {data.completedAt || !next ? (
              <>
                <AppText variant="heading">Programme complete!</AppText>
                <AppText color="textMuted">
                  You finished all {data.durationDays} days. Repeat any workout below.
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="heading">
                  Day {next.dayNumber}: {next.title.replace(/^Week \d+: /, "")}
                </AppText>
                <AppText color="textMuted">
                  About {data.minutesPerSession} minutes · no equipment
                </AppText>
                <Button label="Start workout" onPress={() => open(next.id)} />
              </>
            )}
          </Card>
          <AppText variant="overline" color="textMuted">
            Your {data.durationDays}-day plan · {data.completedDayIds.length} done
          </AppText>
          <ProgramCalendar plan={data} nextDayId={next?.id ?? null} onOpen={open} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { paddingTop: spacing.md } });
