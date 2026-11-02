// Registers this app with the shared kit; must stay the first import.
import "@/appConfig";
import { AppRoot, rootStackOptions, useRootSession } from "@goal4me/app-kit/app/AppRoot";
import { initMonitoring, withMonitoring } from "@goal4me/app-kit/lib/monitoring";
import { Stack } from "expo-router";
import { useOnboardingHydrated } from "@/features/onboarding/store";

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
 * Route guards: signed-out users see the welcome and auth screens, signed-in
 * users see the tabs. The quiz is open to both (a signed-in user without a
 * plan can still take it).
 */
function RootNavigator() {
  // Wait for saved quiz answers too, so screens never flash an empty quiz.
  const { ready, session } = useRootSession(useOnboardingHydrated());
  if (!ready) return null;

  return (
    <Stack screenOptions={rootStackOptions}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/[dayId]"
          options={{
            presentation: "fullScreenModal",
            gestureEnabled: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="progress/log" options={{ presentation: "modal" }} />
        <Stack.Screen name="progress/photos" />
        <Stack.Screen name="account/delete" />
        <Stack.Screen name="account/new-password" />
        <Stack.Screen name="running/level" options={{ presentation: "modal" }} />
        <Stack.Screen name="running/setup" options={{ presentation: "modal" }} />
        <Stack.Screen name="running/plan" />
        <Stack.Screen name="running/guides" />
        <Stack.Screen name="running/guide/[slug]" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen
          name="running/run/[runNumber]"
          options={{
            presentation: "fullScreenModal",
            gestureEnabled: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
        <Stack.Screen name="paynow/return" />
      </Stack.Protected>
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}
