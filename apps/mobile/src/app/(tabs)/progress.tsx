import { goalProgress, round } from "@goal4me/core";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Button, Card, ProgressBar, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import { NeedsPlan } from "@/features/home/NeedsPlan";
import { formatWeight } from "@/features/onboarding/units";
import { useBodyMetrics, useStreak } from "@/features/progress/api";
import { MeasurementsCard } from "@/features/progress/components/MeasurementsCard";
import { StreakCard } from "@/features/progress/components/StreakCard";
import { WeightChart } from "@/features/progress/components/WeightChart";
import { useProgressPhotos } from "@/features/progress/photos";
import { toUserMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { colors, radii, spacing } from "@/theme/tokens";

const RECENT_ROWS = 8;

/** Progress tab: weight trend, measurements, photos, streak and badges. */
export default function Progress() {
  const userId = useUserId();
  const summary = useHomeSummary(userId);
  const metrics = useBodyMetrics(userId);
  const streak = useStreak(userId);
  const photos = useProgressPhotos(userId);

  if (summary.isPending || metrics.isPending) return <LoadingView />;
  if (summary.isError || metrics.isError) {
    const error = summary.error ?? metrics.error;
    return (
      <ErrorView
        message={toUserMessage(error)}
        onRetry={() => void Promise.all([summary.refetch(), metrics.refetch()])}
      />
    );
  }

  const { profile, goal } = summary.data;
  const entries = metrics.data;
  const first = entries[0];
  const latest = entries.at(-1);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          Progress
        </AppText>
        {goal ? (
          <Button
            label="Log weight"
            onPress={() => router.push("/progress/log")}
            style={styles.logButton}
          />
        ) : null}
      </View>

      {!goal || !first || !latest ? (
        <NeedsPlan />
      ) : (
        <>
          <Card>
            <View style={styles.summary}>
              <View style={styles.flex}>
                <AppText variant="caption" color="textMuted">
                  Change since {formatDate(first.measuredOn)}
                </AppText>
                <ChangeText
                  changeKg={round(latest.weightKg - first.weightKg, 1)}
                  wantsLoss={goal.targetWeightKg < first.weightKg}
                  units={profile.units}
                />
              </View>
              <View style={styles.right}>
                <AppText variant="caption" color="textSubtle">
                  Now
                </AppText>
                <AppText variant="heading">{formatWeight(latest.weightKg, profile.units)}</AppText>
              </View>
            </View>
            <ProgressBar
              value={goalProgress(first.weightKg, latest.weightKg, goal.targetWeightKg)}
            />
            <AppText variant="caption" color="textSubtle">
              {Math.round(goalProgress(first.weightKg, latest.weightKg, goal.targetWeightKg) * 100)}
              % of the way to {formatWeight(goal.targetWeightKg, profile.units)}
            </AppText>
          </Card>

          <Card>
            <AppText variant="overline" color="textMuted">
              Weight
            </AppText>
            <WeightChart entries={entries} targetKg={goal.targetWeightKg} units={profile.units} />
          </Card>

          <MeasurementsCard entries={entries} units={profile.units} />

          <Card>
            <View style={styles.summary}>
              <AppText variant="overline" color="textMuted" style={styles.flex}>
                Photos
              </AppText>
              <AppText variant="caption" color="textSubtle">
                Private to you
              </AppText>
            </View>
            {photos.isError ? (
              <AppText color="danger">{toUserMessage(photos.error)}</AppText>
            ) : photos.data && photos.data.length > 0 ? (
              <View style={styles.thumbs}>
                {photos.data.slice(0, 3).map((photo) => (
                  <Pressable
                    key={photo.id}
                    style={styles.thumb}
                    onPress={() => router.push("/progress/photos")}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`${photo.pose} photo from ${formatDate(photo.takenOn)}`}
                  >
                    {photo.url ? (
                      <Image source={{ uri: photo.url }} style={styles.image} contentFit="cover" />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : (
              <AppText color="textMuted">
                Photos show changes the scale misses. Take one every two weeks in the same spot and
                light.
              </AppText>
            )}
            <Button
              label={photos.data?.length ? "See all photos" : "Add your first photo"}
              variant="secondary"
              onPress={() => router.push("/progress/photos")}
            />
          </Card>

          {streak.data ? (
            <StreakCard streak={streak.data.streak} earned={streak.data.earned} />
          ) : null}

          <AppText variant="overline" color="textMuted">
            Recent weigh-ins
          </AppText>
          <View>
            {entries
              .slice(-RECENT_ROWS)
              .reverse()
              .map((entry) => (
                <Pressable
                  key={entry.measuredOn}
                  style={styles.row}
                  onPress={() =>
                    router.push({ pathname: "/progress/log", params: { date: entry.measuredOn } })
                  }
                  accessibilityRole="button"
                  accessibilityHint="Edit this weigh-in"
                >
                  <AppText color="textMuted">{formatDate(entry.measuredOn)}</AppText>
                  <AppText variant="bodyStrong">
                    {formatWeight(entry.weightKg, profile.units)}
                  </AppText>
                </Pressable>
              ))}
          </View>
        </>
      )}
    </Screen>
  );
}

/** Colours the change by whether it moves toward the user's own goal. */
function ChangeText({
  changeKg,
  wantsLoss,
  units,
}: {
  changeKg: number;
  wantsLoss: boolean;
  units: "metric" | "imperial";
}) {
  const towardGoal = changeKg === 0 ? null : wantsLoss ? changeKg < 0 : changeKg > 0;
  const sign = changeKg > 0 ? "+" : changeKg < 0 ? "−" : "";
  return (
    <AppText
      variant="display"
      color={towardGoal === null ? "text" : towardGoal ? "success" : "warning"}
    >
      {sign}
      {formatWeight(Math.abs(changeKg), units)}
    </AppText>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingTop: spacing.md, gap: spacing.md },
  flex: { flex: 1 },
  logButton: { minHeight: 44, paddingHorizontal: spacing.lg },
  summary: { flexDirection: "row", alignItems: "flex-end" },
  right: { alignItems: "flex-end" },
  thumbs: { flexDirection: "row", gap: spacing.sm },
  thumb: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
  },
  image: { width: "100%", height: "100%" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
