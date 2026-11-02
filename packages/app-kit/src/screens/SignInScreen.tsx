import { Link, type Href } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { appConfig } from "../app/config";
import { AppText, Banner, Button, Screen, TextField } from "../components/ui";
import type { TextFieldRef } from "../components/ui/TextField";
import { signInWithEmail } from "../auth/api";
import { SocialSignIn } from "../auth/SocialSignIn";
import { useAuthForm } from "../auth/useAuthForm";
import { signInSchema } from "../auth/validation";
import { spacing } from "../theme/tokens";

export function SignInScreen() {
  const app = appConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef<TextFieldRef>(null);
  const form = useAuthForm(signInSchema, signInWithEmail);
  const submit = () => void form.handleSubmit({ email, password });

  return (
    <Screen
      footer={
        <>
          <Button label="Sign in" loading={form.submitting} onPress={submit} />
          <AppText variant="caption" color="textMuted" align="center">
            New to {app.name}?{" "}
            <Link href={app.startHref as Href}>
              <AppText variant="caption" color="brand">
                {app.startLabel}
              </AppText>
            </Link>
          </AppText>
        </>
      }
    >
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          Welcome back
        </AppText>
        <AppText color="textMuted">Sign in to pick up where you left off.</AppText>
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
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={form.errors.password}
      />
      <Link href={{ pathname: "/reset-password", params: { email } }} style={styles.forgot}>
        <AppText variant="caption" color="brand">
          Forgot your password?
        </AppText>
      </Link>
      <SocialSignIn />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingTop: spacing.lg },
  forgot: { alignSelf: "flex-end" },
});
