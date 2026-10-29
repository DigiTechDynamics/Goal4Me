import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, ProgressBar, Screen } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";

const MESSAGES = [
  "Calculating your BMI",
  "Working out your calorie needs",
  "Choosing your programme",
  "Projecting your goal date",
];
const STEP_MS = 750;

/** Short "building your plan" moment between the quiz and the result. */
export default function Analysing() {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= MESSAGES.length) {
      router.replace("/result");
      return;
    }
    const timer = setTimeout(() => setDone((n) => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [done]);

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <AppText variant="title" align="center" accessibilityLiveRegion="polite">
          Building your plan
        </AppText>
        <ProgressBar value={done / MESSAGES.length} />
        <View style={styles.list}>
          {MESSAGES.map((message, i) => (
            <View key={message} style={styles.row}>
              <View style={[styles.dot, i < done && styles.dotDone]} />
              <AppText color={i < done ? "text" : "textSubtle"}>{message}</AppText>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: spacing.xl },
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfaceRaised },
  dotDone: { backgroundColor: colors.brand },
});
