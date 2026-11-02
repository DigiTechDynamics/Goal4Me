// Registers this app with the shared kit; must stay the first import.
import "@/appConfig";
import { AppRoot, rootStackOptions, useRootSession } from "@goal4me/app-kit/app/AppRoot";
import { initMonitoring, withMonitoring } from "@goal4me/app-kit/lib/monitoring";
import { Stack } from "expo-router";

initMonitoring();

function RootLayout() {
  return (
    <AppRoot>
      <RootNavigator />
    </AppRoot>
  );
}

export default withMonitoring(RootLayout);

/**
 * Route guards: signed-out users see the welcome and auth screens; signed-in
 * users see the tabs, which send anyone without a currency to /setup first.
 */
function RootNavigator() {
  const { ready, session } = useRootSession();
  if (!ready) return null;

  return (
    <Stack screenOptions={rootStackOptions}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setup" options={{ gestureEnabled: false }} />
        <Stack.Screen name="money/expense" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/income" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/category" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/goal-new" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/goal/[id]" />
        <Stack.Screen name="money/lesson/[id]" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="account/delete" />
        <Stack.Screen name="account/new-password" />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
        <Stack.Screen name="paynow/return" />
      </Stack.Protected>
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}
