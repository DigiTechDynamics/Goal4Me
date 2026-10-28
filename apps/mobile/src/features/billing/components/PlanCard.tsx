import type { PlanId } from "@goal4me/schemas";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { PLAN_COPY } from "../copy";

interface PlanCardProps {
  planId: PlanId;
  /** Total for the period, already formatted in the payer's currency. */
  price: string;
  perWeek: string | null;
  /** Extra line under the title, e.g. "7-day free trial". */
  note?: string | null;
  selected: boolean;
  onPress: () => void;
}

/** One selectable subscription option on the paywall. */
export function PlanCard({ planId, price, perWeek, note, selected, onPress }: PlanCardProps) {
  const { title, badge } = PLAN_COPY[planId];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${price}${perWeek ? `, ${perWeek} a week` : ""}${badge ? `, ${badge}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      {badge ? (
        <View style={[styles.badge, selected && styles.badgeSelected]}>
          <AppText variant="overline" color={selected ? "onBrand" : "text"}>
            {badge}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={note ? "brand" : "textMuted"}>
          {note ?? (perWeek ? `${price} total` : "No commitment")}
        </AppText>
      </View>
      <View style={styles.price}>
        <AppText variant="heading">{perWeek ?? price}</AppText>
        {perWeek ? (
          <AppText variant="caption" color="textMuted">
            per week
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.brand, backgroundColor: colors.surfaceRaised },
  pressed: { opacity: 0.8 },
  badge: {
    position: "absolute",
    top: -11,
    right: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  badgeSelected: { backgroundColor: colors.brand },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.brand },
  dot: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.brand },
  text: { flex: 1, gap: 2 },
  price: { alignItems: "flex-end" },
});
