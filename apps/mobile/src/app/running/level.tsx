import {
  assessRunnerLevel,
  getRunProgram,
  RUN_LEVEL_INFO,
  type LongestRun,
  type RunnerAnswers,
} from "@goal4me/core";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { AppText, Banner, Button, Card, ChoiceCard, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useSetRunnerLevel } from "@/features/running/api";
import { LevelLadder } from "@/features/running/components/LevelLadder";
import { toUserMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";

const LONGEST: { value: LongestRun; label: string; description?: string }[] = [
  { value: "none", label: "I don't run yet", description: "Starting from zero is perfect" },
  { value: "under_10", label: "Up to 10 minutes" },
  { value: "10_30", label: "10 to 30 minutes" },
  { value: "30_60", label: "30 to 60 minutes", description: "About 5K to 10K" },
  { value: "over_60", label: "More than an hour", description: "10K and beyond" },
];

const FREQUENCY: { value: RunnerAnswers["runsPerWeek"]; label: string }[] = [
  { value: 0, label: "Not at the moment" },
  { value: 1, label: "Once a week" },
  { value: 2, label: "Twice a week" },
  { value: 3, label: "3 or more times" },
];

/** Two questions place the runner on the novice-to-pro ladder. */
export default function RunnerLevel() {
  const userId = useUserId();
  const save = useSetRunnerLevel(userId);
  const [longest, setLongest] = useState<LongestRun | null>(null);
  const [frequency, setFrequency] = useState<RunnerAnswers["runsPerWeek"] | null>(null);
  const [result, setResult] = useState<ReturnType<typeof assessRunnerLevel> | null>(null);

  if (result) {
    const level = RUN_LEVEL_INFO[result.level];
    const program = getRunProgram(result.program);
    return (
      <Screen
        footer={
          <Button
            label={`Build my ${program.name} plan`}
            onPress={() =>
              router.replace({ pathname: "/running/setup", params: { program: result.program } })
            }
          />
        }
      >
        <BackButton variant="close" />
        <AppText variant="overline" color="brand">
          Your level
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {level.name}: {level.range}
        </AppText>
        <Card>
          <LevelLadder level={result.level} />
        </Card>
        <Card>
          <AppText variant="overline" color="textMuted">
            Recommended programme
          </AppText>
          <AppText variant="heading">{program.name}</AppText>
          <AppText color="textMuted">{program.description}</AppText>
        </Card>
      </Screen>
    );
  }

  const submit = () => {
    if (longest === null || frequency === null) return;
    const assessed = assessRunnerLevel({ longestRun: longest, runsPerWeek: frequency });
    save.mutate(assessed.level, { onSuccess: () => setResult(assessed) });
  };

  return (
    <Screen
      footer={
        <>
          {save.isError ? <Banner message={toUserMessage(save.error)} /> : null}
          <Button
            label="See my level"
            disabled={longest === null || frequency === null}
            loading={save.isPending}
            onPress={submit}
          />
        </>
      }
    >
      <BackButton variant="close" />
      <AppText variant="title" accessibilityRole="header">
        Find your running level
      </AppText>
      <AppText color="textMuted">
        Be honest: starting a little easy is how runners stay injury-free.
      </AppText>
      <AppText variant="heading">How long can you run without stopping?</AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {LONGEST.map((o) => (
          <ChoiceCard
            key={o.value}
            label={o.label}
            description={o.description}
            selected={longest === o.value}
            onPress={() => setLongest(o.value)}
          />
        ))}
      </View>
      <AppText variant="heading">How often do you run now?</AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {FREQUENCY.map((o) => (
          <ChoiceCard
            key={o.value}
            label={o.label}
            selected={frequency === o.value}
            onPress={() => setFrequency(o.value)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ options: { gap: spacing.md } });
