import { useQuery } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppText, Banner, Button } from "@/components/ui";
import { isCancellation, toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { colors, radii, spacing } from "@/theme/tokens";
import { fetchAuthProviders, signInWithApple, signInWithGoogle } from "./api";

/**
 * Apple (iOS only) and Google sign-in buttons with shared loading and error
 * state. A button only shows once the project reports that provider as
 * switched on; if the check itself fails (e.g. offline) both are shown and
 * any error is explained on press.
 */
export function SocialSignIn() {
  const providers = useQuery({
    queryKey: ["auth-providers"],
    queryFn: fetchAuthProviders,
    // Not persisted: switching a provider on should show up on the next launch.
    staleTime: 5 * 60 * 1000,
    retry: 1,
    meta: { persist: false },
  });
  const enabled = providers.isError
    ? { google: true, apple: true }
    : (providers.data ?? { google: false, apple: false });
  const [appleDevice, setAppleDevice] = useState(false);
  const [pending, setPending] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleDevice)
      .catch(() => setAppleDevice(false));
  }, []);

  const run = async (provider: "apple" | "google") => {
    setError(null);
    setPending(provider);
    try {
      await (provider === "apple" ? signInWithApple() : signInWithGoogle());
    } catch (caught) {
      if (!isCancellation(caught)) {
        logger.warn("Social sign-in failed", { provider, error: String(caught) });
        setError(toUserMessage(caught));
      }
    } finally {
      setPending(null);
    }
  };

  const showApple = appleDevice && enabled.apple;
  if (!showApple && !enabled.google) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <AppText variant="caption" color="textSubtle">
          or continue with
        </AppText>
        <View style={styles.divider} />
      </View>
      {error ? <Banner message={error} /> : null}
      {showApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={radii.pill}
          style={styles.apple}
          onPress={() => void run("apple")}
        />
      ) : null}
      {enabled.google ? (
        <Button
          label="Continue with Google"
          variant="secondary"
          loading={pending === "google"}
          disabled={pending !== null}
          onPress={() => void run("google")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  apple: { height: 56, width: "100%" },
});
