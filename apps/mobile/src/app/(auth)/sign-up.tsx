import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Screen, TextField } from "@/components/ui";
import type { TextFieldRef } from "@/components/ui/TextField";
import { signUpWithEmail } from "@/features/auth/api";
import { SocialSignIn } from "@/features/auth/SocialSignIn";
import { useAuthForm } from "@/features/auth/useAuthForm";
import { signUpSchema } from "@/features/auth/validation";
import { spacing } from "@/theme/tokens";
import { track } from "@/lib/analytics";

export default function SignUp() {
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
          Your plan is saved on this phone and will be added to your account.
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
          Save your plan
        </AppText>
        <AppText color="textMuted">
          Create a free account to track your workouts, weight and savings.
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
