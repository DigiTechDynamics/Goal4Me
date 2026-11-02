import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ACCOUNT_NOTE, appConfig } from "../app/config";
import { AppText, Banner, Button, Screen, TextField } from "../components/ui";
import type { TextFieldRef } from "../components/ui/TextField";
import { signUpWithEmail } from "../auth/api";
import { SocialSignIn } from "../auth/SocialSignIn";
import { useAuthForm } from "../auth/useAuthForm";
import { signUpSchema } from "../auth/validation";
import { spacing } from "../theme/tokens";
import { track } from "../lib/analytics";

export function SignUpScreen() {
  const app = appConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);
  const passwordRef = useRef<TextFieldRef>(null);

  // On success with an active session, the root guard moves the user to the tabs.
  const form = useAuthForm(signUpSchema, async (values) => {
    const { signedIn } = await signUpWithEmail(values);
    track("signed_up", { method: "email" });
    if (!signedIn) setConfirmationSentTo(values.email);
  });

  if (confirmationSentTo) {
    return (
      <Screen footer={<Button label="Go to sign in" onPress={() => router.replace("/sign-in")} />}>
        <AppText variant="title">Check your email</AppText>
        <AppText color="textMuted">
          We sent a confirmation link to {confirmationSentTo}. Open it on this device, then sign in.
          {app.signUp.pendingNote ? ` ${app.signUp.pendingNote}` : ""}
        </AppText>
      </Screen>
    );
  }

  const submit = () => void form.handleSubmit({ email, password });

  return (
    <Screen
      footer={
        <>
          <Button label="Create account" loading={form.submitting} onPress={submit} />
          <AppText variant="caption" color="textMuted" align="center">
            Already have an account?{" "}
            <Link href="/sign-in" replace>
              <AppText variant="caption" color="brand">
                Sign in
              </AppText>
            </Link>
          </AppText>
        </>
      }
    >
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          {app.signUp.title}
        </AppText>
        <AppText color="textMuted">{app.signUp.subtitle}</AppText>
        <AppText variant="caption" color="textSubtle">
          {ACCOUNT_NOTE}
        </AppText>
      </View>
      {form.formError ? <Banner message={form.formError} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={form.errors.email}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={form.errors.password}
        placeholder="8+ characters, incl. a number"
      />
      <SocialSignIn />
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.sm, paddingTop: spacing.lg } });
