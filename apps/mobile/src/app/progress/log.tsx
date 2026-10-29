import { addDays, MEASUREMENT_KEYS, type MeasurementKey } from "@goal4me/core";
import { bodyMetricSchema } from "@goal4me/schemas";
import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Screen, SegmentedControl, TextField } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useHomeSummary } from "@/features/home/api";
import type { Units } from "@/features/onboarding/steps";
import {
  lengthInUnits,
  parseLength,
  parseWeight,
  weightInUnits,
} from "@/features/onboarding/units";
import { useBodyMetrics, useLogBodyMetric, type BodyMetric } from "@/features/progress/api";
import { MEASUREMENT_LABEL } from "@/features/progress/components/MeasurementsCard";
import { toUserMessage } from "@/lib/errors";
import { formatDate, localToday } from "@/lib/format";
import { spacing } from "@/theme/tokens";

type DayChoice = "today" | "yesterday";

/**
 * Log (or edit) a weigh-in with optional body measurements. Opened from the
 * Progress tab; `?date=YYYY-MM-DD` edits an existing day.
 */
export default function LogWeight() {
  const userId = useUserId();
  const { date: editDate } = useLocalSearchParams<{ date?: string }>();
  const summary = useHomeSummary(userId);
  const metrics = useBodyMetrics(userId);
  const [day, setDay] = useState<DayChoice>("today");

  if (summary.isPending || metrics.isPending) return <LoadingView />;
  if (summary.isError || metrics.isError) {
    return (
      <ErrorView
        message={toUserMessage(summary.error ?? metrics.error)}
        onRetry={() => void Promise.all([summary.refetch(), metrics.refetch()])}
      />
    );
  }

  const today = localToday();
  const date = editDate ?? (day === "today" ? today : addDays(today, -1));
  const existing = metrics.data.find((entry) => entry.measuredOn === date);
  const latest = metrics.data.at(-1);

  return (
    <LogForm
      // Remount when the date changes so the fields refill from that day.
      key={date}
      userId={userId}
      date={date}
      units={summary.data.profile.units}
      existing={existing}
      fallback={latest}
      dayPicker={
        editDate ? null : (
          <SegmentedControl
            options={[
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
            ]}
            value={day}
            onChange={setDay}
            accessibilityLabel="Weigh-in day"
          />
        )
      }
    />
  );
}

type FieldErrors = Partial<Record<"weight" | MeasurementKey, string>>;

function LogForm({
  userId,
  date,
  units,
  existing,
  fallback,
  dayPicker,
}: {
  userId: string;
  date: string;
  units: Units;
  existing: BodyMetric | undefined;
  fallback: BodyMetric | undefined;
  dayPicker: ReactNode;
}) {
  const save = useLogBodyMetric(userId);
  const prefillWeight = existing ?? fallback;
  const [weight, setWeight] = useState(
    prefillWeight ? String(weightInUnits(prefillWeight.weightKg, units)) : "",
  );
  const [lengths, setLengths] = useState<Record<MeasurementKey, string>>(() => {
    const initial = { waistCm: "", hipsCm: "", chestCm: "", armCm: "" };
    for (const key of MEASUREMENT_KEYS) {
      const value = existing?.[key];
      if (typeof value === "number") initial[key] = String(lengthInUnits(value, units));
    }
    return initial;
  });
  const [showMeasurements, setShowMeasurements] = useState(
    MEASUREMENT_KEYS.some((key) => typeof existing?.[key] === "number"),
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const weightKg = parseWeight(weight, units);
    const next: FieldErrors = {};
    if (weightKg === null) next.weight = "Enter your weight";

    const measurements: Partial<Record<MeasurementKey, number>> = {};
    for (const key of MEASUREMENT_KEYS) {
      if (lengths[key].trim() === "") continue;
      const cm = parseLength(lengths[key], units);
      if (cm === null) next[key] = "Enter a number";
      else measurements[key] = cm;
    }

    if (weightKg !== null) {
      const parsed = bodyMetricSchema.safeParse({
        // A same-day re-log keeps the server's existing id (see log_body_metric).
        id: randomUUID(),
        measuredOn: date,
        weightKg,
        ...measurements,
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] === "weightKg" ? "weight" : (issue.path[0] as MeasurementKey);
          next[field] ??=
            field === "weight" ? "That weight looks out of range" : "That looks out of range";
        }
      } else if (Object.keys(next).length === 0) {
        setErrors({});
        save.mutate(parsed.data, { onSuccess: () => router.back() });
        return;
      }
    }
    setErrors(next);
  };

  const weightUnit = units === "metric" ? "kg" : "lb";
  const lengthUnit = units === "metric" ? "cm" : "in";

  return (
    <Screen
      footer={
        <Button
          label={existing ? "Update weigh-in" : "Save weigh-in"}
          loading={save.isPending}
          onPress={submit}
        />
      }
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={16}
        >
          <AppText variant="heading">✕</AppText>
        </Pressable>
      </View>
      <AppText variant="title" accessibilityRole="header">
        {existing ? "Edit weigh-in" : "Log your weight"}
      </AppText>
      <AppText color="textMuted">
        {formatDate(date)}. For the most reliable trend, weigh yourself in the morning, before
        breakfast.
      </AppText>
      {dayPicker}
      {save.isError ? <Banner message={toUserMessage(save.error)} /> : null}

      <TextField
        label="Weight"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        suffix={weightUnit}
        error={errors.weight}
        autoFocus={!existing}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      {showMeasurements ? (
        <View style={styles.measurements}>
          <AppText variant="overline" color="textMuted">
            Measurements (optional)
          </AppText>
          <View style={styles.grid}>
            {MEASUREMENT_KEYS.map((key) => (
              <View key={key} style={styles.cell}>
                <TextField
                  label={MEASUREMENT_LABEL[key]}
                  value={lengths[key]}
                  onChangeText={(text) => setLengths((prev) => ({ ...prev, [key]: text }))}
                  keyboardType="decimal-pad"
                  suffix={lengthUnit}
                  error={errors[key]}
                />
              </View>
            ))}
          </View>
          <AppText variant="caption" color="textSubtle">
            Measure at the widest point (hips, chest), at the navel (waist) and mid upper arm.
          </AppText>
        </View>
      ) : (
        <Button
          label="Add measurements"
          variant="ghost"
          onPress={() => setShowMeasurements(true)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", paddingTop: spacing.sm },
  measurements: { gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell: { flexBasis: "45%", flexGrow: 1 },
});
