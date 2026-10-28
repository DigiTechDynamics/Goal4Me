import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { AppText } from "@/components/ui";
import { spacing } from "@/theme/tokens";
import { PAYWALL_REASONS, type PaywallReason } from "../copy";
import { Benefits } from "./Benefits";

/** Close button, headline (matched to why the paywall opened) and benefits. */
export function PaywallHeader({ reason }: { reason: PaywallReason }) {
  return (
    <>
      <BackButton variant="close" />
      <View style={styles.headline}>
        <AppText variant="overline" color="brand">
          Goal4Me Premium
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {PAYWALL_REASONS[reason]}
        </AppText>
      </View>
      <Benefits />
    </>
  );
}

const styles = StyleSheet.create({ headline: { gap: spacing.xs } });
