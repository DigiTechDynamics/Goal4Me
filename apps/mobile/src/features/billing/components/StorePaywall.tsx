import type { PlanId } from "@goal4me/schemas";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Screen } from "@/components/ui";
import { isCancellation, toUserMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";
import { useRestorePurchases, useStorePlans, useStorePurchase, type StoreResult } from "../api";
import { PLANS_IN_ORDER, type PaywallReason } from "../copy";
import { storeBilling } from "../purchases";
import { PaywallHeader } from "./PaywallHeader";
import { PlanCard } from "./PlanCard";

const STORE_NAME = Platform.OS === "ios" ? "Apple ID" : "Google Play account";

/** Messages for outcomes that aren't "premium" (premium closes the paywall). */
const RESULT_MESSAGE: Partial<Record<StoreResult, { tone: "success" | "warning"; text: string }>> =
  {
    pending: {
      tone: "success",
      text: "Payment received. Premium is being switched on and will unlock within a few minutes.",
    },
    nothing_to_restore: {
      tone: "warning",
      text: `We couldn't find an active Goal4Me subscription on this ${STORE_NAME}.`,
    },
  };

/**
 * iOS and Android checkout through App Store / Google Play billing
 * (RevenueCat). Store rules require in-app purchases here, so PayNow is never
 * offered in the native apps. Prices come from the store, in local currency.
 */
export function StorePaywall({
  userId,
  reason,
  onPremium,
}: {
  userId: string;
  reason: PaywallReason;
  onPremium: () => void;
}) {
  const [planId, setPlanId] = useState<PlanId>("premium_quarterly");
  const plans = useStorePlans(userId);
  const purchase = useStorePurchase(userId);
  const restore = useRestorePurchases(userId);
  const busy = purchase.isPending || restore.isPending;

  const handle = (result: StoreResult) => {
    if (result === "premium") onPremium();
  };
  const outcome = purchase.data ?? restore.data;
  const message = outcome ? RESULT_MESSAGE[outcome] : undefined;
  const failure = [purchase.error, restore.error].find((e) => e && !isCancellation(e));

  const byId = new Map((plans.data ?? []).map((plan) => [plan.planId, plan]));
  const selected = byId.get(planId);
  const offered = PLANS_IN_ORDER.filter((id) => byId.has(id));

  let body: ReactNode;
  if (!storeBilling.available) {
    body = (
      <Banner
        tone="warning"
        message="Subscriptions in the app are opening soon. Meanwhile you can upgrade on the Goal4Me website."
      />
    );
  } else if (plans.isPending) {
    body = <ActivityIndicator color={colors.brand} style={styles.loading} />;
  } else if (plans.isError || offered.length === 0) {
    body = (
      <>
        <Banner
          message={
            plans.isError
              ? toUserMessage(plans.error)
              : "Plans aren't available in your store right now."
          }
        />
        <Button label="Try again" variant="secondary" onPress={() => void plans.refetch()} />
      </>
    );
  } else {
    body = (
      <View style={styles.plans} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
        {offered.map((id) => {
          const plan = byId.get(id);
          if (!plan) return null;
          return (
            <PlanCard
              key={id}
              planId={id}
              price={plan.price}
              perWeek={id === "premium_weekly" ? null : plan.perWeek}
              note={plan.trialDays ? `${plan.trialDays}-day free trial, then ${plan.price}` : null}
              selected={planId === id}
              onPress={() => setPlanId(id)}
            />
          );
        })}
      </View>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label={selected?.trialDays ? `Start ${selected.trialDays}-day free trial` : "Continue"}
            disabled={!selected || restore.isPending}
            loading={purchase.isPending}
            onPress={() => purchase.mutate(planId, { onSuccess: handle })}
          />
          <Button
            label="Restore purchases"
            variant="ghost"
            disabled={!storeBilling.available || purchase.isPending}
            loading={restore.isPending}
            onPress={() => restore.mutate(undefined, { onSuccess: handle })}
          />
          <AppText variant="caption" color="textSubtle" align="center">
            Charged to your {STORE_NAME}. Renews automatically unless cancelled at least 24 hours
            before the period ends. Manage or cancel any time in your {STORE_NAME} settings.
          </AppText>
        </>
      }
    >
      <PaywallHeader reason={reason} />
      {body}
      {message && !busy ? <Banner tone={message.tone} message={message.text} /> : null}
      {failure && !busy ? <Banner message={toUserMessage(failure)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  plans: { gap: spacing.lg, paddingTop: spacing.sm },
  loading: { paddingVertical: spacing.xxl },
});
