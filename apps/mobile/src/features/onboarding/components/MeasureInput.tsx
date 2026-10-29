import { kgToLb, round, cmToFeetInches } from "@goal4me/core";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, SegmentedControl, TextField } from "@/components/ui";
import { spacing } from "@/theme/tokens";
import type { Units } from "../steps";
import { parseHeight, parseWeight } from "../units";

interface MeasureInputProps {
  kind: "height" | "weight";
  label: string;
  /** Current value in metric (cm or kg). */
  valueMetric: number | undefined;
  units: Units;
  onUnitsChange: (units: Units) => void;
  /** Called with the metric value, or undefined while the input is not a number. */
  onChange: (metric: number | undefined) => void;
  error?: string | undefined;
}

const UNIT_OPTIONS = [
  { value: "metric", label: "kg / cm" },
  { value: "imperial", label: "lb / ft" },
] as const;

function initialText(kind: "height" | "weight", metric: number | undefined, units: Units) {
  if (metric === undefined) return { a: "", b: "" };
  if (kind === "weight") {
    return { a: String(units === "metric" ? round(metric, 1) : Math.round(kgToLb(metric))), b: "" };
  }
  if (units === "metric") return { a: String(Math.round(metric)), b: "" };
  const { feet, inches } = cmToFeetInches(metric);
  return { a: String(feet), b: String(Math.round(inches)) };
}

/** Height or weight entry with a metric/imperial toggle. Always reports metric. */
export function MeasureInput({
  kind,
  label,
  valueMetric,
  units,
  onUnitsChange,
  onChange,
  error,
}: MeasureInputProps) {
  const [text, setText] = useState(() => initialText(kind, valueMetric, units));

  const update = (a: string, b: string) => {
    setText({ a, b });
    const metric = kind === "weight" ? parseWeight(a, units) : parseHeight(a, b, units);
    onChange(metric ?? undefined);
  };

  const switchUnits = (next: Units) => {
    onUnitsChange(next);
    setText(initialText(kind, valueMetric, next));
  };

  const imperialHeight = kind === "height" && units === "imperial";

  return (
    <View style={styles.container}>
      <SegmentedControl
        options={UNIT_OPTIONS}
        value={units}
        onChange={switchUnits}
        accessibilityLabel="Measurement units"
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={imperialHeight ? "Feet" : label}
            value={text.a}
            onChangeText={(a) => update(a, text.b)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            maxLength={5}
            suffix={
              kind === "weight"
                ? units === "metric"
                  ? "kg"
                  : "lb"
                : units === "metric"
                  ? "cm"
                  : "ft"
            }
            error={imperialHeight ? undefined : error}
            autoFocus
          />
        </View>
        {imperialHeight ? (
          <View style={styles.flex}>
            <TextField
              label="Inches"
              value={text.b}
              onChangeText={(b) => update(text.a, b)}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={2}
              suffix="in"
            />
          </View>
        ) : null}
      </View>
      {imperialHeight && error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
});
