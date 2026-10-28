import { router } from "expo-router";
import { AppText, Button, Screen } from "@/components/ui";

export default function NotFound() {
  return (
    <Screen footer={<Button label="Go home" onPress={() => router.replace("/")} />}>
      <AppText variant="title">Page not found</AppText>
      <AppText color="textMuted">The page you're looking for doesn't exist or has moved.</AppText>
    </Screen>
  );
}
