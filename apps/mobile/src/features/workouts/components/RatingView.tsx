import type { WorkoutRating } from "@goal4me/core";
import { StyleSheet, View } from "react-native";
import { AppText, ChoiceCard } from "@/components/ui";
import { spacing } from "@/theme/tokens";

const OPTIONS: { value: WorkoutRating; label: string; description: string }[] = [
  { value: "too_easy", label: "Too easy", description: "I could have done more" },
  { value: "just_right", label: "Just right", description: "Challenging but doable" },
  { value: "too_hard", label: "Too hard", description: "I struggled to finish" },
];

/** After-workout rating; it tunes the next workouts (see nextIntensityFactor). */
export function RatingView({
  value,
  onChange,
}: {
  value: WorkoutRating | null;
  onChange: (r: WorkoutRating) => void;
}) {
  return (
    <View style={styles.list}>
      <AppText variant="heading">How did that feel?</AppText>
      <AppText color="textMuted">
        Your answer adjusts the reps and timings of your next workouts.
      </AppText>
      {OPTIONS.map((option) => (
        <ChoiceCard
          key={option.value}
          label={option.label}
          description={option.description}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.md } });
