import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Banner, Button, Card, Screen, TextField } from "@/components/ui";
import { deleteMyAccount } from "@/features/account/api";
import { useUserId } from "@/features/auth/AuthProvider";
import { logger } from "@/lib/logger";
import { toUserMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";

const CONFIRM_WORD = "DELETE";

const WHAT_GOES = [
  "Your profile, goals and quiz answers",
  "Every weigh-in, measurement and progress photo",
  "Workout history, streaks and badges",
  "Budgets, savings goals and lesson progress",
];

/**
 * Permanent, self-service account deletion (required by Apple and Google,
 * and by data-protection law in our markets). Typing a word, rather than a
 * single tap, prevents accidents. On success the session ends and the
 * route guard returns the user to the welcome screen.
 */
export default function DeleteAccount() {
  const userId = useUserId();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = confirm.trim().toUpperCase() === CONFIRM_WORD;

  const submit = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount(userId);
    } catch (caught) {
      logger.error("Account deletion failed", {
        message: caught instanceof Error ? caught.message : String(caught),
      });
      setError(toUserMessage(caught));
      setDeleting(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          label="Delete my account"
          variant="danger"
          disabled={!confirmed}
          loading={deleting}
          onPress={() => void submit()}
        />
      }
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={16}
          disabled={deleting}
        >
          <AppText variant="heading">←</AppText>
        </Pressable>
      </View>
      <AppText variant="title" accessibilityRole="header">
        Delete your account
      </AppText>
      <AppText color="textMuted">
        This permanently removes your account and everything in it. It can't be undone.
      </AppText>
      <Card>
        {WHAT_GOES.map((line) => (
          <AppText key={line}>• {line}</AppText>
        ))}
      </Card>
      <Banner
        tone="info"
        message="Deleting your account doesn't cancel an App Store or Google Play subscription. Cancel it in your store settings first. Payment receipts are kept, without your name, for tax records."
      />
      {error ? <Banner message={error} /> : null}
      <TextField
        label={`Type ${CONFIRM_WORD} to confirm`}
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!deleting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", paddingTop: spacing.sm },
});
