import { Linking, Platform } from "react-native";
import { AppText, Banner, Button, Card } from "@/components/ui";
import { isCancellation, toUserMessage } from "@/lib/errors";
import { formatTimestamp } from "@/lib/format";
import { usePremium, useRestorePurchases } from "../api";
import { autoRenews } from "../copy";
import { openPaywall } from "../gating";
import { storeBilling } from "../purchases";

/** Where each store lets people change or cancel a subscription. */
const MANAGE_URL: Partial<Record<string, string>> = {
  app_store: "https://apps.apple.com/account/subscriptions",
  play_store: "https://play.google.com/store/account/subscriptions",
};

const RESTORE_MESSAGE = {
  premium: "Your subscription has been restored.",
  pending: "Purchase found. Premium will switch on within a few minutes.",
  nothing_to_restore: "No active subscription was found for this store account.",
  cancelled: "",
} as const;

/** Profile: current plan, upgrade, manage and restore. */
export function PremiumCard({ userId }: { userId: string }) {
  const premium = usePremium(userId);
  const restore = useRestorePurchases(userId);
  const status = premium.data;
  const manageUrl = status?.store ? MANAGE_URL[status.store] : undefined;

  return (
    <Card>
      <AppText variant="overline" color={status?.isPremium ? "brand" : "textMuted"}>
        {status?.isPremium ? "Premium" : "Free plan"}
      </AppText>
      {premium.isPending ? (
        <AppText color="textMuted">Checking your plan…</AppText>
      ) : status?.isPremium ? (
        <AppText color="textMuted">
          {status.expiresAt
            ? `${autoRenews(status.store) ? "Renews" : "Active until"} ${formatTimestamp(status.expiresAt)}.`
            : "Active."}{" "}
          Every workout and lesson is unlocked.
        </AppText>
      ) : (
        <AppText color="textMuted">
          3 workouts per programme and 3 money lessons. Premium unlocks everything.
        </AppText>
      )}
      {premium.isError ? <Banner message={toUserMessage(premium.error)} /> : null}
      {!premium.isPending && !status?.isPremium ? (
        <Button label="Go Premium" onPress={() => openPaywall("general")} />
      ) : null}
      {manageUrl && Platform.OS !== "web" ? (
        <Button
          label="Manage subscription"
          variant="secondary"
          onPress={() => void Linking.openURL(manageUrl)}
        />
      ) : null}
      {storeBilling.available ? (
        <Button
          label="Restore purchases"
          variant="ghost"
          loading={restore.isPending}
          onPress={() => restore.mutate()}
        />
      ) : null}
      {restore.data && RESTORE_MESSAGE[restore.data] ? (
        <Banner
          tone={restore.data === "nothing_to_restore" ? "warning" : "success"}
          message={RESTORE_MESSAGE[restore.data]}
        />
      ) : null}
      {restore.error && !isCancellation(restore.error) ? (
        <Banner message={toUserMessage(restore.error)} />
      ) : null}
    </Card>
  );
}
