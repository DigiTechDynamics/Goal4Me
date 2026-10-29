import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText, Button } from "@/components/ui";
import { colors, spacing } from "@/theme/tokens";

export function LoadingView({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <AppText variant="heading" align="center">
        We couldn't load this
      </AppText>
      <AppText color="textMuted" align="center">
        {message}
      </AppText>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
});
