import { useUserId } from "@goal4me/app-kit/auth/AuthProvider";
import { signOut } from "@goal4me/app-kit/auth/api";
import {
  AppText,
  Banner,
  Button,
  ChoiceCard,
  ProgressBar,
  Screen,
} from "@goal4me/app-kit/components/ui";
import { track } from "@goal4me/app-kit/lib/analytics";
import { toUserMessage } from "@goal4me/app-kit/lib/errors";
import { spacing } from "@goal4me/app-kit/theme/tokens";
import { SUPPORTED_CURRENCIES } from "@goal4me/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useCompleteMoneySetup } from "@/features/profile/api";
import {
  chooseCountry,
  COUNTRY_OPTIONS,
  CURRENCY_LABEL,
  EMPTY_SETUP,
  MONEY_GOAL_OPTIONS,
  SETUP_STEPS,
  toSetupInput,
  validateSetupStep,
  type SetupDraft,
} from "@/features/setup/flow";

const TITLES = {
  country: { title: "Where do you live?", subtitle: "We'll suggest your currency." },
  currency: {
    title: "Which currency do you budget in?",
    subtitle: "All amounts in the app use it. Pick the one you're paid in.",
  },
  goal: {
    title: "What's your top money goal?",
    subtitle: "We'll point you to the lessons that help most. You can skip this.",
  },
  agree: { title: "One last thing", subtitle: "Please read and agree to continue." },
} as const;

/**
 * Goal4Me Money's first run (signed in, no currency yet): country, currency,
 * an optional money goal, and the education-not-advice notice. Nothing about
 * the body is asked here; that lives in Goal4Me Fit.
 */
export default function Setup() {
  const userId = useUserId();
  const save = useCompleteMoneySetup(userId);
  const [draft, setDraft] = useState<SetupDraft>(EMPTY_SETUP);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const step = SETUP_STEPS[index] ?? "agree";
  const isLast = index === SETUP_STEPS.length - 1;

  const update = (next: SetupDraft) => {
    setDraft(next);
    setError(null);
  };

  const next = () => {
    const problem = validateSetupStep(step, draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    const result = toSetupInput(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    save.mutate(result.input, {
      onSuccess: () => {
        track("onboarding_completed", { goal: result.input.moneyGoal ?? "none" });
        router.replace("/(tabs)");
      },
    });
  };

  const back = () => {
    setError(null);
    setIndex(Math.max(0, index - 1));
  };

  return (
    <Screen
      footer={
        <>
          <Button
            label={isLast ? "Start budgeting" : "Continue"}
            loading={save.isPending}
            onPress={next}
          />
          {step === "goal" ? (
            <Button
              label="Skip"
              variant="ghost"
              onPress={() => {
                update({ ...draft, moneyGoal: null });
                setIndex(index + 1);
              }}
            />
          ) : null}
          {index === 0 ? (
            <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
          ) : null}
        </>
      }
    >
      <View style={styles.header}>
        {index > 0 ? (
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={16}
            style={styles.back}
          >
            <AppText variant="heading">‹</AppText>
          </Pressable>
        ) : null}
        <View style={styles.progress}>
          <ProgressBar value={(index + 1) / SETUP_STEPS.length} />
        </View>
        <AppText variant="caption" color="textMuted">
          {index + 1}/{SETUP_STEPS.length}
        </AppText>
      </View>

      <View style={styles.titles}>
        <AppText variant="title" accessibilityRole="header">
          {TITLES[step].title}
        </AppText>
        <AppText color="textMuted">{TITLES[step].subtitle}</AppText>
      </View>

      {error ? <Banner message={error} /> : null}
      {save.isError ? <Banner message={toUserMessage(save.error)} /> : null}

      <View style={styles.options} accessibilityRole={step === "agree" ? undefined : "radiogroup"}>
        {step === "country"
          ? COUNTRY_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.value}
                label={option.label}
                selected={draft.country === option.value}
                onPress={() => update(chooseCountry(draft, option.value))}
              />
            ))
          : null}
        {step === "currency"
          ? SUPPORTED_CURRENCIES.map((code) => (
              <ChoiceCard
                key={code}
                label={code}
                description={CURRENCY_LABEL[code]}
                selected={draft.currency === code}
                onPress={() => update({ ...draft, currency: code })}
              />
            ))
          : null}
        {step === "goal"
          ? MONEY_GOAL_OPTIONS.map((option) => (
              <ChoiceCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={draft.moneyGoal === option.value}
                onPress={() => update({ ...draft, moneyGoal: option.value })}
              />
            ))
          : null}
        {step === "agree" ? (
          <ChoiceCard
            multi
            label="I understand"
            description="Goal4Me Money offers general financial education, not personal financial advice. It never connects to your bank."
            selected={draft.disclaimerAccepted}
            onPress={() => update({ ...draft, disclaimerAccepted: !draft.disclaimerAccepted })}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.md },
  back: { paddingRight: spacing.xs },
  progress: { flex: 1 },
  titles: { gap: spacing.xs },
  options: { gap: spacing.md },
});
