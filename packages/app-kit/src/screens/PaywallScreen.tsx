import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { LoadingView } from "../components/StateViews";
import { Screen } from "../components/ui";
import { useUserId } from "../auth/AuthProvider";
import { usePremium } from "../billing/api";
import { autoRenews, PAYWALL_REASONS, type PaywallReason } from "../billing/copy";
import { PaynowPaywall } from "../billing/components/PaynowPaywall";
import { PremiumWelcome } from "../billing/components/PremiumWelcome";
import { StorePaywall } from "../billing/components/StorePaywall";
import { track } from "../lib/analytics";

const asReason = (value: string | undefined): PaywallReason =>
  value && value in PAYWALL_REASONS ? (value as PaywallReason) : "general";

/**
 * Premium paywall (modal). Native apps sell store subscriptions; the web
 * sells PayNow one-off passes. Already-premium users see their status.
 */
export function PaywallScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const userId = useUserId();
  const premium = usePremium(userId);
  // Paying refreshes the premium query, which flips this screen to the welcome view.
  const { refetch } = premium;
  const refresh = useCallback(() => void refetch(), [refetch]);

  useEffect(() => {
    track("paywall_viewed", { reason: asReason(reason), platform: Platform.OS });
  }, [reason]);

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
