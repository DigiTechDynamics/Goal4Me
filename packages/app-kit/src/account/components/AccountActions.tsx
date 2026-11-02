import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import { ACCOUNT_BRAND, appConfig } from "../../app/config";
import { signOut } from "../../auth/api";
import { AppText, Banner, Button, Card } from "../../components/ui";
import { toUserMessage } from "../../lib/errors";
import { exportMyData } from "../api";

/**
 * The bottom of every Profile tab: download or delete the account's data,
 * sign out, and the app's legal notice. The account is shared by both apps,
 * so the export and deletion cover everything, not just this app's data.
 */
export function AccountActions() {
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const app = appConfig();

  const doExport = async () => {
    setExporting(true);
    setError(null);
    setExportDone(false);
    try {
      await exportMyData();
      setExportDone(true);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setExporting(false);
    }
  };

  const doSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (caught) {
      setError(toUserMessage(caught));
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    // Alert has no buttons on the web, so confirm with the browser dialog there.
    if (Platform.OS === "web") {
      if (window.confirm(`Sign out of ${app.name}?`)) void doSignOut();
      return;
    }
    Alert.alert("Sign out?", "Your data stays safe in your account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void doSignOut() },
    ]);
  };

  return (
    <>
      {error ? <Banner message={error} /> : null}
      <Card>
        <AppText variant="overline" color="textMuted">
          Your data
        </AppText>
        <AppText color="textMuted">
          Download a copy of everything {ACCOUNT_BRAND} stores about you, or delete your account for
          good. Both cover your whole account, in every {ACCOUNT_BRAND} app.
        </AppText>
        {exportDone ? <Banner tone="success" message="Your data file is ready." /> : null}
        <Button
          label="Download my data"
          variant="secondary"
          loading={exporting}
          onPress={() => void doExport()}
        />
        <Button
          label="Delete account"
          variant="ghost"
          onPress={() => router.push("/account/delete")}
        />
      </Card>
      <Button label="Sign out" variant="secondary" loading={signingOut} onPress={confirmSignOut} />
      <AppText variant="caption" color="textSubtle">
        {app.disclaimer}
      </AppText>
    </>
  );
}
