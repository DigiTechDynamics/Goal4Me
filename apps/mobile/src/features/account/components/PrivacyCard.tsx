import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { AppText, Card } from "@/components/ui";
import { analyticsAvailable, analyticsOptedOut, setAnalyticsOptOut } from "@/lib/analytics";
import { colors, spacing } from "@/theme/tokens";

/** react-native-web colours the "on" thumb with activeThumbColor, which RN's types lack. */
const WEB_THUMB = { activeThumbColor: colors.text } as object;

/** Profile: opt out of anonymous usage analytics (kept on this device). */
export function PrivacyCard() {
  const [sharing, setSharing] = useState(() => !analyticsOptedOut());
  if (!analyticsAvailable) return null;

  const toggle = (value: boolean) => {
    setSharing(value);
    void setAnalyticsOptOut(!value);
  };

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="bodyStrong">Share usage data</AppText>
          <AppText variant="caption" color="textMuted">
            Which screens and features you use, never your health or money details. Helps us improve
            Goal4Me.
          </AppText>
        </View>
        <Switch
          value={sharing}
          onValueChange={toggle}
          accessibilityLabel="Share usage data"
          trackColor={{ false: colors.border, true: colors.brand }}
          thumbColor={colors.text}
          {...WEB_THUMB}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  text: { flex: 1, gap: spacing.xs },
});
