import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";
import { env } from "./env";
import { setErrorReporter } from "./logger";

/**
 * Crash and error reporting (Sentry). Off unless EXPO_PUBLIC_SENTRY_DSN is
 * set. Privacy rules (health and money data are sensitive):
 *   - no IP address, cookies or request bodies (sendDefaultPii: false)
 *   - breadcrumbs from network calls drop query strings and bodies
 *   - the user is identified by an opaque id only, never email
 */
const dsn = env?.EXPO_PUBLIC_SENTRY_DSN;

export const monitoringEnabled = !!dsn;

export function initMonitoring(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: __DEV__ ? "development" : "production",
    // 10% of sessions get performance traces; plenty at thousands of users.
    tracesSampleRate: 0.1,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        const url = typeof breadcrumb.data?.url === "string" ? breadcrumb.data.url : "";
        return { ...breadcrumb, data: { ...breadcrumb.data, url: url.split("?")[0] } };
      }
      // Console breadcrumbs may contain user input; the logger already reports errors.
      return breadcrumb.category === "console" ? null : breadcrumb;
    },
  });
  // Every logger.error() becomes a Sentry event (context is already redacted).
  setErrorReporter((message, context) => {
    Sentry.captureMessage(message, { level: "error", extra: context });
  });
}

/** Tag errors with the signed-in user's opaque id (or clear it on sign-out). */
export function setMonitoringUser(userId: string | null): void {
  if (!dsn) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/** Wraps the root component so crashes in rendering are captured. */
export const withMonitoring = <P extends Record<string, unknown>>(component: ComponentType<P>) =>
  dsn ? Sentry.wrap(component) : component;
