import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { DarkTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { AppText } from "../components/ui";
import { identifyUser } from "../lib/analytics";
import { envErrors } from "../lib/env";
import { setMonitoringUser } from "../lib/monitoring";
import { PERSIST_OPTIONS, QUERY_CACHE_KEY, queryClient } from "../lib/queryClient";
import { colors, spacing } from "../theme/tokens";

/**
 * The root shell both apps share: providers (safe area, persisted query
 * cache, auth, navigation theme), the splash screen, and the configuration
 * screen shown when required environment variables are missing.
 *
 * Each app's src/app/_layout.tsx renders <AppRoot> around its own route
 * stack, so the navigator (which routes exist, which are protected) stays
 * in the app while the plumbing lives here once.
 */

// Keep the splash up until auth (and any app-specific store) is ready.
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

/** Screen options every root stack uses. */
export const rootStackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

export function AppRoot({ children }: { children: ReactNode }) {
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
            {children}
          </ThemeProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Session state for the root navigator. `ready` is false until auth has
 * loaded and `extraReady` (e.g. a persisted quiz store) is true; the splash
 * screen hides once it flips. Crash reports and analytics learn the account
 * only by its opaque id, and forget it only on an actual sign-out.
 */
export function useRootSession(extraReady = true): {
  ready: boolean;
  session: Session | null;
} {
  const { session, initializing } = useAuth();
  const ready = !initializing && extraReady;
  const userId = session?.user.id ?? null;

  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    if (initializing || previousUser.current === userId) return;
    setMonitoringUser(userId);
    identifyUser(userId);
    previousUser.current = userId;
  }, [initializing, userId]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return { ready, session };
}

/** Shown instead of the app when required environment variables are missing. */
function ConfigurationError() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <View style={styles.config}>
      <AppText variant="title">Configuration needed</AppText>
      <AppText color="textMuted">
        Copy .env.example to .env in this app's folder and fill in:
      </AppText>
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
