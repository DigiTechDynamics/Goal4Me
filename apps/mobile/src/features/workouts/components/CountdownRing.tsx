import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { AppText } from "@/components/ui";
import { colors } from "@/theme/tokens";

const SIZE = 220;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Big timer, readable from across the room. `total` sets how full the ring starts. */
export function CountdownRing({
  remaining,
  total,
  label,
  tone = "brand",
}: {
  remaining: number;
  total: number;
  label: string;
  tone?: "brand" | "info";
}) {
  const fraction = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  return (
    <View
      style={styles.wrap}
      accessibilityRole="timer"
      accessibilityLabel={`${remaining} seconds left`}
    >
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.surfaceRaised}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors[tone]}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <AppText variant="display" style={styles.number}>
        {remaining}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  svg: { position: "absolute" },
  number: { fontSize: 72, lineHeight: 80 },
});
