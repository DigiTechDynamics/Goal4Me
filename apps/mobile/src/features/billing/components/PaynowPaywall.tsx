import { paynowCheckoutSchema, type PlanId } from "@goal4me/schemas";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Screen, SegmentedControl, TextField } from "@/components/ui";
import { toUserMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";
import { useStartCheckout } from "../api";
import { PLAN_COPY, PLANS_IN_ORDER, planPrice, type PaywallReason } from "../copy";
import { PaymentWaiting } from "./PaymentWaiting";
import { PaywallHeader } from "./PaywallHeader";
import { PlanCard } from "./PlanCard";

type Method = "web" | "ecocash" | "onemoney";
const METHODS: readonly { value: Method; label: string }[] = [
  { value: "web", label: "Card & more" },
  { value: "ecocash", label: "EcoCash" },
  { value: "onemoney", label: "OneMoney" },
];

/**
 * Web checkout through PayNow (Zimbabwe). "Card & more" sends the user to
 * PayNow's hosted page and back to /paynow/return; EcoCash and OneMoney push a
 * PIN prompt to the phone and we wait here. Payments are one-off, not renewing.
 */
export function PaynowPaywall({
  userId,
  reason,
  onPaid,
}: {
  userId: string;
  reason: PaywallReason;
  onPaid: () => void;
}) {
  const [planId, setPlanId] = useState<PlanId>("premium_quarterly");
  const [method, setMethod] = useState<Method>("web");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [pending, setPending] = useState<{ reference: string; instructions: string | null } | null>(
    null,
  );
  const checkout = useStartCheckout();
  const price = planPrice(planId);

  const pay = () => {
    const input =
      method === "web" ? { method, planId } : { method, planId, phone: phone.replace(/\s/g, "") };
    const parsed = paynowCheckoutSchema.safeParse(input);
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message ?? "Check your number");
      return;
    }
    setPhoneError(undefined);
    checkout.mutate(parsed.data, {
      onSuccess: (result) => {
        if (method === "web" && result.redirectUrl && Platform.OS === "web") {
          // Leave for PayNow's page; it sends the user back to /paynow/return.
          window.location.assign(result.redirectUrl);
          return;
        }
        setPending({ reference: result.reference, instructions: result.instructions });
      },
    });
  };

  const retry = () => {
    setPending(null);
    checkout.reset();
  };

  if (pending) {
    return (
      <Screen>
        <PaywallHeader reason={reason} />
        <PaymentWaiting
          userId={userId}
          reference={pending.reference}
          instructions={pending.instructions}
          onPaid={onPaid}
          onRetry={retry}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          {/* In the pinned footer so the number and its error stay in view above the keyboard. */}
          {method !== "web" ? (
            <TextField
              label={`${method === "ecocash" ? "EcoCash" : "OneMoney"} number`}
              value={phone}
              onChangeText={setPhone}
              placeholder="0771234567"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={13}
              error={phoneError}
              returnKeyType="go"
              onSubmitEditing={pay}
            />
          ) : null}
          {checkout.isError ? <Banner message={toUserMessage(checkout.error)} /> : null}
          <Button
            label={`Pay ${price.total} with PayNow`}
            loading={checkout.isPending}
            onPress={pay}
          />
          <AppText variant="caption" color="textSubtle" align="center">
            One-off payment for {PLAN_COPY[planId].title.toLowerCase()}. It doesn't renew
            automatically. Prices in US dollars.
          </AppText>
        </>
      }
    >
      <PaywallHeader reason={reason} />
      <View style={styles.plans} accessibilityRole="radiogroup" accessibilityLabel="Choose a plan">
        {PLANS_IN_ORDER.map((id) => {
          const p = planPrice(id);
          return (
            <PlanCard
              key={id}
              planId={id}
              price={p.total}
              perWeek={id === "premium_weekly" ? null : p.perWeek}
              selected={planId === id}
              onPress={() => setPlanId(id)}
            />
          );
        })}
      </View>
      <SegmentedControl
        accessibilityLabel="Payment method"
        options={METHODS}
        value={method}
        onChange={(value) => {
          setMethod(value);
          setPhoneError(undefined);
        }}
      />
      {method === "web" ? (
        <AppText variant="caption" color="textMuted">
          Pay by Visa, Mastercard, EcoCash, OneMoney and more on PayNow's secure page.
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ plans: { gap: spacing.lg, paddingTop: spacing.sm } });
