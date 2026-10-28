import { BMI_BANDS, type BmiCategory } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";

/** Range drawn on the scale: BMI 15 to 40 covers almost everyone. */
const SCALE_MIN = 15;
const SCALE_MAX = 40;

export const CATEGORY_LABEL: Record<BmiCategory, string> = {
  underweight: "Underweight",
  healthy: "Healthy",
  overweight: "Overweight",
  obese: "Obese",
};

export const CATEGORY_COLOR: Record<BmiCategory, string> = {
  underweight: colors.info,
  healthy: colors.success,
  overweight: colors.warning,
  obese: colors.danger,
};

const segments: { category: BmiCategory; from: number; to: number }[] = [
  { category: "underweight", from: SCALE_MIN, to: BMI_BANDS.underweightBelow },
  { category: "healthy", from: BMI_BANDS.underweightBelow, to: BMI_BANDS.overweightFrom },
  { category: "overweight", from: BMI_BANDS.overweightFrom, to: BMI_BANDS.obeseFrom },
  { category: "obese", from: BMI_BANDS.obeseFrom, to: SCALE_MAX },
];

const position = (bmi: number) =>
  ((Math.min(SCALE_MAX, Math.max(SCALE_MIN, bmi)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

/** Colour-banded BMI scale with a marker at the user's value. */
export function BmiScale({ bmi, category }: { bmi: number; category: BmiCategory }) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Your BMI is ${bmi}, which is ${CATEGORY_LABEL[category]}`}
    >
      <View style={styles.track}>
        {segments.map((segment) => (
          <View
            key={segment.category}
            style={{
              flex: segment.to - segment.from,
              backgroundColor: CATEGORY_COLOR[segment.category],
              opacity: segment.category === category ? 1 : 0.35,
            }}
          />
        ))}
      </View>
      <View style={[styles.marker, { left: `${position(bmi)}%` }]} />
      <View style={styles.labels}>
        {[BMI_BANDS.underweightBelow, BMI_BANDS.overweightFrom, BMI_BANDS.obeseFrom].map(
          (value) => (
            <AppText
              key={value}
              variant="caption"
              color="textSubtle"
              style={[styles.tick, { left: `${position(value)}%` }]}
            >
              {value}
            </AppText>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  track: { flexDirection: "row", height: 12, borderRadius: radii.pill, overflow: "hidden", gap: 2 },
  marker: {
    position: "absolute",
    top: 2,
    width: 6,
    height: 28,
    marginLeft: -3,
    borderRadius: 3,
    backgroundColor: colors.text,
    borderWidth: 1,
    borderColor: colors.background,
  },
  labels: { position: "relative", height: 18, marginTop: spacing.sm },
  tick: { position: "absolute", width: 40, marginLeft: -20, textAlign: "center" },
});
