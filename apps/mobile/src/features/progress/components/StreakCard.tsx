import { badgeStates, type LiveStreak, type StreakStatus } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { AppText, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { colors, radii, spacing, type ColorToken } from "@/theme/tokens";

const STATUS: Record<StreakStatus, { text: string; color: ColorToken }> = {
  done_today: { text: "Done for today. See you tomorrow.", color: "success" },
  at_risk: { text: "Train today to keep your streak going.", color: "warning" },
  freeze_needed: {
    text: "You missed a day. Train today and your weekly freeze saves the streak.",
    color: "warning",
  },
  none: { text: "Finish a workout to start a streak.", color: "textMuted" },
};

/** Current streak with what to do next, and the badge collection. */
export function StreakCard({
  streak,
  earned,
}: {
  streak: LiveStreak;
  earned: { badge: string; earnedAt: string }[];
}) {
  const status = STATUS[streak.status];
  const badges = badgeStates(earned);

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="overline" color="textMuted">
            Streak
          </AppText>
          <AppText variant="display" color={streak.days > 0 ? "brand" : "textMuted"}>
            {streak.days}
            <AppText variant="heading" color="textMuted">
              {streak.days === 1 ? " day" : " days"}
            </AppText>
          </AppText>
        </View>
        <View style={styles.best}>
          <AppText variant="caption" color="textSubtle">
            Best
          </AppText>
          <AppText variant="heading">{streak.bestDays}</AppText>
        </View>
      </View>
      <AppText variant="caption" color={status.color}>
        {status.text}
      </AppText>

      <View style={styles.badges} accessibilityRole="list">
        {badges.map((badge) => {
          const earnedBadge = badge.earnedAt !== null;
          return (
            <View
              key={badge.id}
              style={[styles.badge, earnedBadge && styles.badgeEarned]}
              accessible
              accessibilityLabel={`${badge.title}: ${badge.description}. ${earnedBadge ? "Earned" : "Not earned yet"}`}
            >
              <AppText variant="bodyStrong" color={earnedBadge ? "text" : "textSubtle"}>
                {badge.title}
              </AppText>
              <AppText variant="caption" color={earnedBadge ? "textMuted" : "textSubtle"}>
                {earnedBadge && badge.earnedAt
                  ? `Earned ${formatDate(badge.earnedAt.slice(0, 10))}`
                  : badge.description}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-end" },
  flex: { flex: 1 },
  best: { alignItems: "flex-end", paddingBottom: spacing.xs },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm },
  badge: {
    flexBasis: "30%",
    flexGrow: 1,
    minWidth: 96,
    padding: spacing.md,
    gap: 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  badgeEarned: {
    borderStyle: "solid",
    borderColor: colors.brand,
    backgroundColor: colors.surfaceRaised,
  },
});
