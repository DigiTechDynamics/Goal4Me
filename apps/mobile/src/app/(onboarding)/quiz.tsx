import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button, ProgressBar, Screen } from "@/components/ui";
import { StepView } from "@/features/onboarding/components/StepView";
import { firstIncompleteStep, stepAt, STEPS, validateStep } from "@/features/onboarding/steps";
import { useOnboardingStore } from "@/features/onboarding/store";
import { spacing } from "@/theme/tokens";

/** Delay before auto-advancing after a single-choice tap, so the selection is visible. */
const AUTO_ADVANCE_MS = 280;

export default function Quiz() {
  const { draft, stepIndex, setAnswer, goTo, markCompleted } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resume where the user left off, but never past an unanswered question.
  const index = Math.min(stepIndex, firstIncompleteStep(draft), STEPS.length - 1);
  const step = stepAt(index);
  const isLast = index === STEPS.length - 1;

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Clear the error as soon as the user changes their answer.
  useEffect(() => setError(null), [draft, index]);

  const next = () => {
    const problem = validateStep(step, useOnboardingStore.getState().draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (isLast) {
      markCompleted();
      router.replace("/analysing");
      return;
    }
    goTo(index + 1);
  };

  const back = () => {
    if (index === 0) router.back();
    else goTo(index - 1);
  };

  const onAnswered = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(next, AUTO_ADVANCE_MS);
  };

  const showContinue = step.kind !== "single" || step.optional === true;

  return (
    <Screen
      footer={
        showContinue ? (
          <>
            <Button label={isLast ? "Build my plan" : "Continue"} onPress={next} />
            {step.kind === "single" && step.optional ? (
              <Button
                label="Skip"
                variant="ghost"
                onPress={() => {
                  setAnswer(step.field, undefined);
                  goTo(index + 1);
                }}
              />
            ) : null}
          </>
        ) : null
      }
    >
      <View style={styles.header}>
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={16}
          style={styles.back}
        >
          <AppText variant="heading">‹</AppText>
        </Pressable>
        <View style={styles.progress}>
          <ProgressBar value={(index + 1) / STEPS.length} />
        </View>
        <AppText variant="caption" color="textMuted">
          {index + 1}/{STEPS.length}
        </AppText>
      </View>

      <View style={styles.titles}>
        <AppText variant="title" accessibilityRole="header">
          {step.title}
        </AppText>
        {step.subtitle ? <AppText color="textMuted">{step.subtitle}</AppText> : null}
      </View>

      <StepView
        step={step}
        draft={draft}
        error={error}
        setAnswer={setAnswer}
        onAnswered={onAnswered}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  progress: { flex: 1 },
  titles: { gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
});
