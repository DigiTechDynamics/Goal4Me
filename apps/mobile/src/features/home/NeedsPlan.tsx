import { router } from "expo-router";
import { AppText, Button, Card } from "@/components/ui";

/** Shown to signed-in users who haven't taken the quiz on this account yet. */
export function NeedsPlan() {
  return (
    <Card>
      <AppText variant="heading">Let's build your plan</AppText>
      <AppText color="textMuted">
        Answer a few quick questions so we can set your targets and pick your programme.
      </AppText>
      <Button label="Start the quiz" onPress={() => router.push("/quiz")} />
    </Card>
  );
}
