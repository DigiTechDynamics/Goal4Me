import { RUN_LEVEL_INFO } from "@goal4me/core";
import { useLocalSearchParams } from "expo-router";
import { ArticleBody } from "@/components/ArticleBody";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Card, Screen } from "@/components/ui";
import { LockedCard } from "@/features/billing/components/LockedCard";
import { useRunGuide } from "@/features/running/api";
import { toUserMessage } from "@/lib/errors";

/** One running guide, ending with a single thing to try on the next run. */
export default function RunGuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = useRunGuide(slug);

  if (guide.isPending) return <LoadingView />;
  if (guide.isError) {
    return <ErrorView message={toUserMessage(guide.error)} onRetry={() => void guide.refetch()} />;
  }
  if (!guide.data) {
    return (
      <Screen>
        <BackButton variant="close" />
        <LockedCard
          reason="run"
          title="This is a Premium guide"
          message="The Starter guides are free. Premium unlocks every guide from 5K to marathon: intervals, tempo runs, fuelling, tapering and race day."
        />
      </Screen>
    );
  }
  const { title, level, body, tryThis } = guide.data;
  return (
    <Screen>
      <BackButton variant="close" />
      <AppText variant="overline" color="brand">
        {RUN_LEVEL_INFO[level].name} guide
      </AppText>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <ArticleBody body={body} />
      {tryThis ? (
        <Card>
          <AppText variant="overline" color="brand">
            Try this on your next run
          </AppText>
          <AppText variant="bodyStrong">{tryThis}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
