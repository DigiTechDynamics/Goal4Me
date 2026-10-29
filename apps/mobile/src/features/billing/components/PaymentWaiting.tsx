import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText, Banner, Button } from "@/components/ui";
import { toUserMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";
import { isFinalFailure, usePaymentStatus } from "../api";

/** After this long we reassure the user that closing the screen is safe. */
const SLOW_AFTER_MS = 90_000;

/**
 * Waits for a PayNow payment to settle (polling our paynow-status function).
 * Calls onPaid once; offers a retry when PayNow reports a failure.
 */
export function PaymentWaiting({
  userId,
  reference,
  instructions,
  onPaid,
  onRetry,
}: {
  userId: string;
  reference: string;
  instructions?: string | null;
  onPaid: () => void;
  onRetry: () => void;
}) {
  const status = usePaymentStatus(userId, reference);
  const [slow, setSlow] = useState(false);
  const paid = status.data?.paid ?? false;

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (paid) onPaid();
  }, [paid, onPaid]);

  if (isFinalFailure(status.data?.status)) {
    return (
      <View style={styles.wrap}>
        <Banner
          message={
            status.data?.status === "cancelled"
              ? "The payment was cancelled. You haven't been charged."
              : "The payment didn't go through. You haven't been charged."
          }
        />
        <Button label="Try again" onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.brand} />
      <AppText variant="heading" align="center">
        Waiting for your payment
      </AppText>
      <AppText color="textMuted" align="center">
        {instructions ?? "Approve the payment on your phone. This usually takes under a minute."}
      </AppText>
      {status.isError ? (
        <Banner tone="warning" message={`${toUserMessage(status.error)} We'll keep checking.`} />
      ) : null}
      {slow ? (
        <AppText variant="caption" color="textSubtle" align="center">
          Still waiting? You can close this screen. If you approved the payment, Premium unlocks by
          itself within a few minutes. Reference {reference}.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, alignItems: "stretch", paddingVertical: spacing.xl },
});
