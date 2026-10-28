import { moneyScore, type MoneyScoreInput } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { AppText, Card } from "@/components/ui";
import { spacing } from "@/theme/tokens";
import { Meter } from "./Meter";

const PARTS = [
  {
    key: "savings",
    label: "Saving",
    max: 35,
    tip: "Add to a savings goal this month. Aim for 20% of income.",
  },
  {
    key: "emergencyFund",
    label: "Safety net",
    max: 30,
    tip: "Grow your emergency fund toward 3 months of needs.",
  },
  { key: "learning", label: "Learning", max: 20, tip: "Take your next 3-minute money lesson." },
  {
    key: "habits",
    label: "Habits",
    max: 15,
    tip: "Log your spending daily to build your money streak.",
  },
] as const;

/** Money score 0–100 with its four parts and a tip for the weakest one. */
export function MoneyScoreCard({ input }: { input: MoneyScoreInput }) {
  const { score, breakdown } = moneyScore(input);
  // The part with the most room to grow (relative to its weight) gets the tip.
  const weakest = [...PARTS].sort((a, b) => breakdown[a.key] / a.max - breakdown[b.key] / b.max)[0];

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="overline" color="textMuted">
            Money score
          </AppText>
          <AppText variant="display" color="brand" accessibilityLabel={`${score} out of 100`}>
            {score}
            <AppText variant="heading" color="textMuted">
              {" "}
              / 100
            </AppText>
          </AppText>
        </View>
      </View>
      {PARTS.map((part) => (
        <View key={part.key} style={styles.row}>
          <AppText variant="caption" color="textMuted" style={styles.label}>
            {part.label}
          </AppText>
          <View style={styles.flex}>
            <Meter value={breakdown[part.key] / part.max} color="info" />
          </View>
          <AppText variant="caption" color="textSubtle" style={styles.points}>
            {breakdown[part.key]}/{part.max}
          </AppText>
        </View>
      ))}
      {weakest && score < 100 ? (
        <AppText variant="caption" color="text">
          Next step: {weakest.tip}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row" },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  label: { width: 76 },
  points: { width: 40, textAlign: "right" },
});
