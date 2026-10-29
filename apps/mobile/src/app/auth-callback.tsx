import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Screen } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { completeAuthRedirect } from "@/features/auth/api";
import { toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { spacing } from "@/theme/tokens";

/**
 * Landing screen for email confirmation, password-reset and OAuth links.
 * It sits outside the route guards so it can show while the session is
 * still being created, then moves on to the app (or the new-password form).
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    next?: string;
    error_code?: string;
    error_description?: string;
  }>();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(
    // Supabase reports an expired or reused link in the URL itself.
    params.error_code || params.error_description
      ? toUserMessage(params.error_code ?? params.error_description)
      : null,
  );
  const started = useRef(false);
  const toNewPassword = params.next === "new-password";

  // Exchange the code exactly once, even if the screen re-renders.
  useEffect(() => {
    if (started.current || error) return;
    started.current = true;
    completeAuthRedirect(params.code ?? null).catch((e: unknown) => {
      logger.warn("Auth redirect failed", { error: String(e) });
      setError(toUserMessage(e));
    });
  }, [error, params.code]);

  // Move on as soon as the session lands, whichever path created it.
  useEffect(() => {
    if (!session) return;
    router.replace(toNewPassword ? "/account/new-password" : "/(tabs)");
  }, [session, toNewPassword]);

  if (!error) return <LoadingView label="Signing you in" />;

  return (
    <Screen
      footer={
        <>
          <Button label="Go to sign in" onPress={() => router.replace("/sign-in")} />
          {toNewPassword ? (
            <Button
              label="Send a new reset link"
              variant="ghost"
              onPress={() => router.replace("/reset-password")}
            />
          ) : null}
        </>
      }
    >
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          {toNewPassword ? "Reset link didn't work" : "Almost there"}
        </AppText>
        <Banner message={error} />
        {!toNewPassword ? (
          <AppText color="textMuted">
            If you were confirming your email, it's confirmed. Sign in with your email and password
            to continue.
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.md, paddingTop: spacing.lg } });
