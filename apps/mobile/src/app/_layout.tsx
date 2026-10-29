import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppText } from "@/components/ui";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { useOnboardingHydrated } from "@/features/onboarding/store";
import { envErrors } from "@/lib/env";
import { PERSIST_OPTIONS, QUERY_CACHE_KEY, queryClient } from "@/lib/queryClient";
import { colors, spacing } from "@/theme/tokens";

void SplashScreen.preventAutoHideAsync();

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_KEY,
});

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.brand,
  },
};

export default function RootLayout() {
  if (envErrors.length > 0) return <ConfigurationError />;
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, ...PERSIST_OPTIONS }}
      >
        <AuthProvider>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style="light" />
            <RootNavigator />
          </ThemeProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Route guards: signed-out users see the welcome and auth screens, signed-in
 * users see the tabs. The quiz is open to both (a signed-in user without a
 * plan can still take it).
 */
function RootNavigator() {
  const { session, initializing } = useAuth();
  // Wait for saved quiz answers too, so screens never flash an empty quiz.
  const hydrated = useOnboardingHydrated();
  const ready = !initializing && hydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
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
        <Stack.Screen name="money/expense" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/income" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/category" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/goal-new" options={{ presentation: "modal" }} />
        <Stack.Screen name="money/goal/[id]" />
        <Stack.Screen name="money/lessons" />
        <Stack.Screen name="money/lesson/[id]" options={{ presentation: "fullScreenModal" }} />
      </Stack.Protected>
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}

/** Shown instead of the app when required environment variables are missing. */
function ConfigurationError() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <View style={styles.config}>
      <AppText variant="title">Configuration needed</AppText>
      <AppText color="textMuted">Copy .env.example to .env and fill in:</AppText>
      {envErrors.map((message) => (
        <AppText key={message} variant="caption" color="warning">
          • {message}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  config: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xxl,
    justifyContent: "center",
    gap: spacing.md,
  },
});
