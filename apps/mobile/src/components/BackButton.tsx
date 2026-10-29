import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { AppText } from "./ui";

/** Top-left close (modals) or back (pushed screens) control. */
export function BackButton({
  variant = "back",
  disabled = false,
}: {
  variant?: "back" | "close";
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={variant === "close" ? "Close" : "Back"}
        hitSlop={16}
        disabled={disabled}
      >
        <AppText variant="heading">{variant === "close" ? "✕" : "←"}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", paddingTop: spacing.sm } });
