import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { AppText, Card, Screen } from "@/components/ui";
import { RUNNING_TIPS } from "@/features/running/guide";
import { colors, spacing } from "@/theme/tokens";

/** Running tips by topic; `?category=id` puts that topic first. */
export default function RunningTips() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const ordered = [
    ...RUNNING_TIPS.filter((c) => c.id === category),
    ...RUNNING_TIPS.filter((c) => c.id !== category),
  ];

  return (
    <Screen>
      <BackButton />
      <AppText variant="title" accessibilityRole="header">
        Running tips
      </AppText>
      {ordered.map((c) => (
        <Card key={c.id} style={c.id === category ? styles.selected : undefined}>
          <AppText variant="heading" accessibilityRole="header">
            {c.icon} {c.title}
          </AppText>
          {c.tips.map((tip) => (
            <View key={tip.title} style={styles.tip}>
              <AppText variant="bodyStrong">{tip.title}</AppText>
              <AppText color="textMuted">{tip.body}</AppText>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  selected: { borderColor: colors.brand },
  tip: { gap: 2, paddingTop: spacing.sm },
});
