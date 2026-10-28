import * as Haptics from "expo-haptics";
import { Platform, StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Card, ProgressBar } from "@/components/ui";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";
import { spacing } from "@/theme/tokens";
import { useAddWater, useWater } from "../api";

const GLASS_ML = 250;

/** Today's water against the personal target, one glass per tap. */
export function WaterCard({ userId, targetMl }: { userId: string; targetMl: number }) {
  const today = localToday();
  const water = useWater(userId, today);
  const add = useAddWater(userId, today);
  const total = water.data ?? 0;

  const change = (deltaMl: number) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    add.mutate(deltaMl);
  };

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="overline" color="textMuted" style={styles.flex}>
          Water
        </AppText>
        <AppText variant="caption" color="textSubtle">
          {(total / 1000).toFixed(2)} / {(targetMl / 1000).toFixed(1)} L
        </AppText>
      </View>
      <ProgressBar value={targetMl > 0 ? total / targetMl : 0} />
      {water.isError ? <Banner message={toUserMessage(water.error)} /> : null}
      {add.isError ? <Banner message={toUserMessage(add.error)} /> : null}
      <View style={styles.actions}>
        <Button
          label="−"
          variant="secondary"
          style={styles.minus}
          disabled={total === 0 || water.isPending}
          onPress={() => change(-GLASS_ML)}
          accessibilityHint="Removes one glass"
        />
        <Button
          label={`+ Glass (${GLASS_ML} ml)`}
          variant="secondary"
          style={styles.flex}
          disabled={water.isPending || total >= 10_000}
          onPress={() => change(GLASS_ML)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  actions: { flexDirection: "row", gap: spacing.sm },
  minus: { width: 72, paddingHorizontal: 0 },
});
