import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText, Button, Screen } from "@goal4me/app-kit/components/ui";
import { colors, radii, spacing } from "@goal4me/app-kit/theme/tokens";

const HIGHLIGHTS = [
  { value: "50/30/20", label: "a budget that sets itself up from your income" },
  { value: "Goals", label: "savings goals with a monthly target" },
  { value: "Lessons", label: "3 minutes each, with a quiz and one small action" },
];

/** Welcome screen: the brand promise and the way into sign-up. */
export default function Welcome() {
  return (
    <Screen
      footer={
        <>
          <Button label="Get started, it's free" onPress={() => router.push("/sign-up")} />
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
          Goal4Me Money
        </AppText>
        <AppText variant="display">Know where your money goes, and make it go further.</AppText>
        <AppText color="textMuted">
          Budget in your own currency, save towards what matters and build money skills in a few
          minutes a day. No bank connection needed.
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
