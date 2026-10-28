import { ADULT_AGE, healthyWeightRange } from "@goal4me/core";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, ChoiceCard, TextField } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import type { QuizDraft, Step } from "../steps";
import { formatWeight } from "../units";
import { MeasureInput } from "./MeasureInput";

interface StepViewProps {
  step: Step;
  draft: QuizDraft;
  error: string | null;
  setAnswer: <K extends keyof QuizDraft>(key: K, value: QuizDraft[K]) => void;
  /** Called after a single-choice answer so the quiz can auto-advance. */
  onAnswered: () => void;
}

/** Renders one quiz question based on its definition in steps.ts. */
export function StepView({ step, draft, error, setAnswer, onAnswered }: StepViewProps) {
  switch (step.kind) {
    case "single":
      return (
        <View style={styles.list} accessibilityRole="radiogroup">
          {step.options.map((option) => (
            <ChoiceCard
              key={String(option.value)}
              label={option.label}
              {...(option.description ? { description: option.description } : {})}
              selected={draft[step.field] === option.value}
              onPress={() => {
                setAnswer(step.field, option.value as never);
                onAnswered();
              }}
            />
          ))}
        </View>
      );

    case "multi": {
      const selected = (draft[step.field] ?? []) as string[];
      const toggle = (value: string) =>
        setAnswer(
          step.field,
          (selected.includes(value)
            ? selected.filter((v) => v !== value)
            : [...selected, value]) as never,
        );
      return (
        <View style={styles.list}>
          {step.options.map((option) => (
            <ChoiceCard
              key={option.value}
              multi
              label={option.label}
              selected={selected.includes(option.value)}
              onPress={() => toggle(option.value)}
            />
          ))}
          {step.noneLabel ? (
            <ChoiceCard
              multi
              label={step.noneLabel}
              selected={selected.length === 0}
              onPress={() => setAnswer(step.field, [] as never)}
            />
          ) : null}
        </View>
      );
    }

    case "number":
      return (
        <TextField
          label="Age"
          suffix="years"
          value={draft.age === undefined ? "" : String(draft.age)}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, "");
            setAnswer("age", digits === "" ? undefined : Number(digits));
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={2}
          autoFocus
          error={error ?? undefined}
        />
      );

    case "measure": {
      const isHeight = step.field === "heightCm";
      const hint =
        step.field === "targetWeightKg" && draft.heightCm !== undefined
          ? (() => {
              const range = healthyWeightRange(draft.heightCm);
              return `A healthy weight for your height is ${formatWeight(range.minKg, draft.units)} to ${formatWeight(range.maxKg, draft.units)}.`;
            })()
          : null;
      return (
        <View style={styles.list}>
          <MeasureInput
            key={step.field}
            kind={isHeight ? "height" : "weight"}
            label={isHeight ? "Height" : "Weight"}
            valueMetric={draft[step.field]}
            units={draft.units}
            onUnitsChange={(units) => setAnswer("units", units)}
            onChange={(value) => setAnswer(step.field, value)}
            error={error ?? undefined}
          />
          {hint ? (
            <AppText variant="caption" color="textMuted" align="center">
              {hint}
            </AppText>
          ) : null}
        </View>
      );
    }

    case "consent":
      return (
        <View style={styles.list}>
          <Agreement
            checked={draft.disclaimerAccepted === true}
            onToggle={() => setAnswer("disclaimerAccepted", !draft.disclaimerAccepted)}
            text="I understand Goal4Me gives general fitness and money education, not medical or financial advice. I'll check with a doctor before starting if I have a health condition, am pregnant, or feel pain or dizziness when exercising."
          />
          <Agreement
            checked={draft.healthConsent === true}
            onToggle={() => setAnswer("healthConsent", !draft.healthConsent)}
            text="I agree that Goal4Me may store my health details (such as weight and height) to personalise my plan. I can export or delete them at any time."
          />
          {draft.age !== undefined && draft.age < ADULT_AGE ? (
            <Agreement
              checked={draft.guardianConsent === true}
              onToggle={() => setAnswer("guardianConsent", !draft.guardianConsent)}
              text="I'm under 18 and a parent or guardian has agreed to me using Goal4Me."
            />
          ) : null}
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}
        </View>
      );
  }
}

function Agreement({
  checked,
  onToggle,
  text,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={[styles.agreement, checked && styles.agreementOn]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? (
          <AppText variant="caption" color="onBrand">
            ✓
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" style={styles.agreementText}>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  agreement: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  agreementOn: { borderColor: colors.brand },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  agreementText: { flex: 1, lineHeight: 20 },
});
