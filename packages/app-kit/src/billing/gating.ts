import { router } from "expo-router";
import type { PaywallReason } from "./copy";

/** Opens the paywall; the reason picks the headline ("Keep your streak going"…). */
export function openPaywall(reason: PaywallReason = "general") {
  router.push({ pathname: "/paywall", params: { reason } });
}
