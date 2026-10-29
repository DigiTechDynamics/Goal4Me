import { RUN_LEVEL_INFO, RUN_LEVELS, type RunLevel } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";

/**
 * The novice-to-pro path as a vertical ladder: completed rungs are filled,
 * the runner's rung is highlighted with what to master next.
 */
export function LevelLadder({
  level,
  compact = false,
}: {
  level: RunLevel | null;
  compact?: boolean;
}) {
  const current = level ? RUN_LEVELS.indexOf(level) : -1;
  return (
    <View style={styles.ladder} accessibilityRole="list">
      {RUN_LEVELS.map((rung, i) => {
        const info = RUN_LEVEL_INFO[rung];
        const isCurrent = i === current;
        const done = i < current;
        return (
          <View
            key={rung}
            style={styles.rung}
            accessibilityLabel={`${info.name}, ${info.range}${isCurrent ? ", your level" : done ? ", done" : ""}`}
          >
            <View style={styles.rail}>
              <View style={[styles.node, done && styles.nodeDone, isCurrent && styles.nodeCurrent]}>
                <AppText variant="caption" color={done || isCurrent ? "onBrand" : "textSubtle"}>
                  {done ? "✓" : i + 1}
                </AppText>
              </View>
              {i < RUN_LEVELS.length - 1 ? (
                <View style={[styles.line, done && styles.lineDone]} />
              ) : null}
            </View>
            <View style={styles.text}>
              <AppText
                variant="bodyStrong"
                color={isCurrent ? "brand" : done ? "textMuted" : "text"}
              >
                {info.name}
                <AppText variant="caption" color="textMuted">
                  {"  "}
                  {info.range}
                </AppText>
              </AppText>
              {isCurrent && !compact
                ? info.milestones.map((m) => (
                    <AppText key={m} variant="caption" color="textMuted">
                      ○ {m}
                    </AppText>
                  ))
                : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const NODE = 28;

const styles = StyleSheet.create({
  ladder: { gap: 0 },
  rung: { flexDirection: "row", gap: spacing.md, minHeight: NODE + spacing.lg },
  rail: { width: NODE, alignItems: "center" },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeDone: { backgroundColor: colors.textSubtle, borderColor: colors.textSubtle },
  nodeCurrent: { backgroundColor: colors.brand, borderColor: colors.brand },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.textSubtle },
  text: { flex: 1, gap: 2, paddingTop: 4, paddingBottom: spacing.md },
});
