import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText, Button, Screen } from "@/components/ui";
import { useOnboardingStore } from "@/features/onboarding/store";
import { colors, radii, spacing } from "@/theme/tokens";

const HIGHLIGHTS = [
  { value: "15 min", label: "home workouts, no equipment" },
  { value: "BMI + kcal", label: "targets built for your body" },
  { value: "Money", label: "budgeting and savings coaching" },
];

/** Welcome screen: the brand promise and the way into the quiz. */
export default function Welcome() {
  const quizDone = useOnboardingStore((state) => state.completedAt !== null);

  return (
    <Screen
      footer={
        <>
          <Button
            label={quizDone ? "See my plan" : "Get my plan"}
            onPress={() => router.push(quizDone ? "/result" : "/quiz")}
          />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push("/sign-in")}
          />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={styles.logo}>
          <AppText variant="title" color="onBrand">
            G4
          </AppText>
        </View>
        <AppText variant="overline" color="brand">
          Goal4Me
        </AppText>
        <AppText variant="display">Your body and your bank balance, both improving.</AppText>
        <AppText color="textMuted">
          Answer a few questions and get a personal calisthenics plan, your health targets and a
          money plan in 2 minutes.
        </AppText>
      </View>
      <View style={styles.highlights}>
        {HIGHLIGHTS.map((item) => (
          <View key={item.value} style={styles.highlight}>
            <AppText variant="heading" color="brand">
              {item.value}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.lg, paddingTop: spacing.xxl },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  highlights: { gap: spacing.md },
  highlight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
