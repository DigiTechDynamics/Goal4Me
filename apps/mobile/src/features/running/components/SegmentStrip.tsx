import type { RunSegment } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { colors, radii } from "@/theme/tokens";
import { SEGMENT_COLOR } from "../copy";

/**
 * A run's shape as one bar: each segment's width is its share of the time
 * and its colour its effort, so "8 × run/walk" or "tempo in the middle"
 * reads at a glance. `current` dims everything already done.
 */
export function SegmentStrip({
  segments,
  current,
  height = 10,
}: {
  segments: readonly RunSegment[];
  current?: number;
  height?: number;
}) {
  return (
    <View
      style={[styles.track, { height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {segments.map((segment, i) => (
        <View
          key={i}
          style={{
            flexGrow: segment.seconds,
            flexBasis: 0,
            backgroundColor: colors[SEGMENT_COLOR[segment.kind]],
            opacity: current !== undefined && i < current ? 0.25 : 1,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: 2,
    borderRadius: radii.pill,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
  },
});
