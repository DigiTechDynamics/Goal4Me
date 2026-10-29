import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { AppText, Banner, Button, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { usePremium } from "@/features/billing/api";
import { autoRenews } from "@/features/billing/copy";
import { PaymentWaiting } from "@/features/billing/components/PaymentWaiting";
import { PremiumWelcome } from "@/features/billing/components/PremiumWelcome";

const REFERENCE = /^G4M-[A-Z0-9-]{1,20}$/;

/**
 * PayNow sends the browser back here (?ref=G4M-…) after the hosted payment
 * page. We confirm the payment with PayNow before unlocking anything.
 */
export default function PaynowReturn() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const userId = useUserId();
  const premium = usePremium(userId);
  const { refetch } = premium;
  const refresh = useCallback(() => void refetch(), [refetch]);
  const home = () => router.replace("/(tabs)");
  const reference = ref && REFERENCE.test(ref) ? ref : null;

  if (premium.data?.isPremium) {
    return (
      <Screen>
        <PremiumWelcome
          expiresAt={premium.data.expiresAt}
          autoRenews={autoRenews(premium.data.store)}
          onContinue={home}
        />
      </Screen>
    );
  }

  if (!reference) {
    return (
      <Screen footer={<Button label="Back to Goal4Me" onPress={home} />}>
        <AppText variant="title" accessibilityRole="header">
          Payment
        </AppText>
        <Banner message="We couldn't find that payment. If you were charged, contact support with your PayNow receipt." />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label="Back to Goal4Me" variant="secondary" onPress={home} />}>
      <AppText variant="title" accessibilityRole="header">
        Confirming your payment
      </AppText>
      <PaymentWaiting
        userId={userId}
        reference={reference}
        instructions="We're checking with PayNow. This only takes a moment."
        onPaid={refresh}
        onRetry={() => router.replace({ pathname: "/paywall", params: { reason: "general" } })}
      />
    </Screen>
  );
}
