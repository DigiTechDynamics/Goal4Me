import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { Platform } from "react-native";
import { LoadingView } from "@/components/StateViews";
import { Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { usePremium } from "@/features/billing/api";
import { autoRenews, PAYWALL_REASONS, type PaywallReason } from "@/features/billing/copy";
import { PaynowPaywall } from "@/features/billing/components/PaynowPaywall";
import { PremiumWelcome } from "@/features/billing/components/PremiumWelcome";
import { StorePaywall } from "@/features/billing/components/StorePaywall";

const asReason = (value: string | undefined): PaywallReason =>
  value && value in PAYWALL_REASONS ? (value as PaywallReason) : "general";

/**
 * Premium paywall (modal). Native apps sell store subscriptions; the web
 * sells PayNow one-off passes. Already-premium users see their status.
 */
export default function Paywall() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const userId = useUserId();
  const premium = usePremium(userId);
  // Paying refreshes the premium query, which flips this screen to the welcome view.
  const { refetch } = premium;
  const refresh = useCallback(() => void refetch(), [refetch]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  if (premium.isPending) return <LoadingView />;
  if (premium.data?.isPremium) {
    return (
      <Screen>
        <PremiumWelcome
          expiresAt={premium.data.expiresAt}
          autoRenews={autoRenews(premium.data.store)}
          onContinue={close}
        />
      </Screen>
    );
  }

  return Platform.OS === "web" ? (
    <PaynowPaywall userId={userId} reason={asReason(reason)} onPaid={refresh} />
  ) : (
    <StorePaywall userId={userId} reason={asReason(reason)} onPremium={refresh} />
  );
}
