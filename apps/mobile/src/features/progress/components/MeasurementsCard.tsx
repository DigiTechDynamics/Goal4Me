import { measurementChanges, type MeasurementKey } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { AppText, Card } from "@/components/ui";
import type { Units } from "@/features/onboarding/steps";
import { formatLength } from "@/features/onboarding/units";
import { colors, spacing } from "@/theme/tokens";
import type { BodyMetric } from "../api";

export const MEASUREMENT_LABEL: Record<MeasurementKey, string> = {
  waistCm: "Waist",
  hipsCm: "Hips",
  chestCm: "Chest",
  armCm: "Arm",
};

/** Latest body measurements and how each has changed since first logged. */
export function MeasurementsCard({ entries, units }: { entries: BodyMetric[]; units: Units }) {
  const changes = measurementChanges(entries);

  return (
    <Card>
      <AppText variant="overline" color="textMuted">
        Measurements
      </AppText>
      {changes.length === 0 ? (
        <AppText color="textMuted">
          Add your waist, hips, chest or arm next time you log your weight. The scale doesn't show
          muscle you gain, but a tape measure does.
        </AppText>
      ) : (
        changes.map((item, i) => (
          <View key={item.key} style={[styles.row, i > 0 && styles.divider]}>
            <AppText color="textMuted" style={styles.flex}>
              {MEASUREMENT_LABEL[item.key]}
            </AppText>
            <AppText variant="bodyStrong">{formatLength(item.latest, units)}</AppText>
            <AppText
              variant="caption"
              color={item.change === null ? "textSubtle" : item.change <= 0 ? "success" : "warning"}
              style={styles.change}
            >
              {item.change === null ? "first entry" : formatLength(item.change, units, true)}
            </AppText>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  flex: { flex: 1 },
  change: { minWidth: 72, textAlign: "right" },
});
