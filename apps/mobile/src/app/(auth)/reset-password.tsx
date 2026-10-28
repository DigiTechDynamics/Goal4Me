import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { AppText, Banner, Button, Screen, TextField } from "@/components/ui";
import { sendPasswordReset } from "@/features/auth/api";
import { useAuthForm } from "@/features/auth/useAuthForm";
import { emailSchema } from "@/features/auth/validation";
import { spacing } from "@/theme/tokens";

const schema = z.object({ email: emailSchema });

export default function ResetPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [sent, setSent] = useState(false);
  const form = useAuthForm(schema, async (values) => {
    await sendPasswordReset(values.email);
    setSent(true);
  });

  if (sent) {
    return (
      <Screen footer={<Button label="Back to sign in" onPress={() => router.back()} />}>
        <AppText variant="title">Check your email</AppText>
        <AppText color="textMuted">
          If an account exists for {email.trim()}, you'll get a link to choose a new password.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label="Send reset link"
          loading={form.submitting}
          onPress={() => void form.handleSubmit({ email })}
        />
      }
    >
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          Reset your password
        </AppText>
        <AppText color="textMuted">Enter your email and we'll send you a link.</AppText>
      </View>
      {form.formError ? <Banner message={form.formError} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={form.errors.email}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.sm, paddingTop: spacing.lg } });
