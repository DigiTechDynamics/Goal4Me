import type { ProjectionPoint } from "@goal4me/core";
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";
import { AppText } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";

const HEIGHT = 160;
const PAD = { top: 16, bottom: 8, left: 8, right: 8 };

/** Smooth weight projection from today to the goal date. */
export function ProjectionChart({
  points,
  startLabel,
  endLabel,
}: {
  points: ProjectionPoint[];
  startLabel: string;
  endLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return null;

  const weights = points.map((p) => p.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (width - PAD.left - PAD.right);
  const y = (kg: number) => PAD.top + ((max - kg) / span) * (HEIGHT - PAD.top - PAD.bottom);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.weightKg).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(points.length - 1)} ${HEIGHT} L${x(0)} ${HEIGHT} Z`;

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel={`Projected weight goes from ${startLabel} today to ${endLabel} at your goal date`}
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.brand} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.brand} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={HEIGHT - 1}
            y2={HEIGHT - 1}
            stroke={colors.border}
          />
          <Path d={area} fill="url(#fill)" />
          <Path d={line} stroke={colors.brand} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle cx={x(0)} cy={y(first.weightKg)} r={5} fill={colors.text} />
          <Circle cx={x(points.length - 1)} cy={y(last.weightKg)} r={7} fill={colors.brand} />
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      <View style={styles.labels}>
        <AppText variant="caption" color="textMuted">
          Today · {startLabel}
        </AppText>
        <AppText variant="caption" color="text">
          Goal · {endLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
});
