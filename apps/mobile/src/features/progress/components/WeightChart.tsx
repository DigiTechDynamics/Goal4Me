import { addDays, movingAverage, sinceDate } from "@goal4me/core";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { AppText, SegmentedControl } from "@/components/ui";
import type { Units } from "@/features/onboarding/steps";
import { weightInUnits } from "@/features/onboarding/units";
import { localToday } from "@/lib/format";
import { colors, spacing } from "@/theme/tokens";
import { buildChart } from "../chart";

const HEIGHT = 200;
// SVG text defaults to a serif font on the web; match the app's UI font.
const AXIS_FONT =
  Platform.OS === "web" ? "system-ui, -apple-system, Segoe UI, sans-serif" : undefined;
const BOX = { left: 36, right: 8, top: 12, bottom: 12 };

type Range = "30" | "90" | "all";
const RANGES: { value: Range; label: string }[] = [
  { value: "30", label: "1M" },
  { value: "90", label: "3M" },
  { value: "all", label: "All" },
];

/**
 * Weigh-ins as faint dots with a 7-entry trend line on top, plus a dashed
 * goal line. Values are drawn in the user's units.
 */
export function WeightChart({
  entries,
  targetKg,
  units,
}: {
  entries: readonly { measuredOn: string; weightKg: number }[];
  targetKg: number | null;
  units: Units;
}) {
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<Range>("90");
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const chart = useMemo(() => {
    // The trend is computed on all data first so the window's first point
    // still reflects the days before it.
    const trend = movingAverage(entries);
    const from = range === "all" ? null : addDays(localToday(), -Number(range));
    const toPoint = (e: { measuredOn: string; weightKg: number }) => ({
      date: e.measuredOn,
      value: weightInUnits(e.weightKg, units),
    });
    const raw = sinceDate(entries, from).map(toPoint);
    const smooth = sinceDate(trend, from).map(toPoint);
    const box = { ...BOX, width, height: HEIGHT };
    const goal = targetKg === null ? null : weightInUnits(targetKg, units);
    // One geometry for both series so they share the same axis. buildChart
    // takes the time span from the first and last points: raw[0] and the last
    // trend point (same date as the last weigh-in).
    const geometry = buildChart([...raw, ...smooth], box, goal);
    const trendDots = geometry.dots.slice(raw.length);
    return {
      geometry,
      rawDots: geometry.dots.slice(0, raw.length),
      trendPath: trendDots.map((d, i) => `${i === 0 ? "M" : "L"}${d.x},${d.y}`).join(" "),
      count: raw.length,
    };
  }, [entries, range, targetKg, units, width]);

  const unitLabel = units === "metric" ? "kg" : "lb";

  return (
    <View style={styles.wrapper}>
      <SegmentedControl
        options={RANGES}
        value={range}
        onChange={setRange}
        accessibilityLabel="Chart range"
      />
      <View
        onLayout={onLayout}
        accessible
        accessibilityLabel={`Weight chart with ${chart.count} weigh-ins in ${unitLabel}`}
      >
        {width > 0 && chart.count > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {chart.geometry.ticks.map((tick) => (
              <Line
                key={tick.value}
                x1={BOX.left}
                x2={width - BOX.right}
                y1={tick.y}
                y2={tick.y}
                stroke={colors.border}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            ))}
            {chart.geometry.ticks.map((tick) => (
              <SvgText
                key={`label-${tick.value}`}
                x={BOX.left - 6}
                y={tick.y + 4}
                fontSize={11}
                fontFamily={AXIS_FONT}
                fill={colors.textSubtle}
                textAnchor="end"
              >
                {tick.value}
              </SvgText>
            ))}
            {chart.geometry.goalY !== null ? (
              <Line
                x1={BOX.left}
                x2={width - BOX.right}
                y1={chart.geometry.goalY}
                y2={chart.geometry.goalY}
                stroke={colors.success}
                strokeDasharray="6 6"
                strokeWidth={1.5}
              />
            ) : null}
            {chart.rawDots.map((dot, i) => (
              <Circle key={i} cx={dot.x} cy={dot.y} r={3} fill={colors.textSubtle} />
            ))}
            <Path
              d={chart.trendPath}
              stroke={colors.brand}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <View style={[styles.empty, { height: HEIGHT }]}>
            <AppText color="textSubtle" align="center">
              No weigh-ins in this period.
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.legend}>
        <LegendSwatch color={colors.brand} label="Trend" />
        <LegendSwatch color={colors.textSubtle} label="Weigh-ins" />
        {targetKg !== null ? <LegendSwatch color={colors.success} label="Goal" /> : null}
      </View>
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  empty: { justifyContent: "center" },
  legend: { flexDirection: "row", gap: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});
