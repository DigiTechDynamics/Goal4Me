import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Screen, TextField } from "@/components/ui";
import type { TextFieldRef } from "@/components/ui/TextField";
import { updatePassword } from "@/features/auth/api";
import { useAuthForm } from "@/features/auth/useAuthForm";
import { newPasswordSchema } from "@/features/auth/validation";
import { spacing } from "@/theme/tokens";

/** Reached from a password-reset email: the link signed the user in, now they pick a password. */
export default function NewPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const confirmRef = useRef<TextFieldRef>(null);
  const form = useAuthForm(newPasswordSchema, async (values) => {
    await updatePassword(values.password);
    setDone(true);
  });
  const submit = () => void form.handleSubmit({ password, confirm });

  if (done) {
    return (
      <Screen footer={<Button label="Continue" onPress={() => router.replace("/(tabs)")} />}>
        <View style={styles.header}>
          <AppText variant="title" accessibilityRole="header">
            Password updated
          </AppText>
          <AppText color="textMuted">Use your new password next time you sign in.</AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={<Button label="Save new password" loading={form.submitting} onPress={submit} />}
    >
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          Choose a new password
        </AppText>
        <AppText color="textMuted">
          You're signed in. Pick a password you haven't used before.
        </AppText>
      </View>
      {form.formError ? <Banner message={form.formError} /> : null}
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={form.errors.password}
        placeholder="8+ characters, incl. a number"
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={form.errors.confirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.sm, paddingTop: spacing.lg } });
