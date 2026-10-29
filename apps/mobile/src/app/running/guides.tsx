import { RUN_LEVEL_INFO, RUN_LEVELS } from "@goal4me/core";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Card, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useIsPremium } from "@/features/billing/api";
import { openPaywall } from "@/features/billing/gating";
import { useRunGuides } from "@/features/running/api";
import { toUserMessage } from "@/lib/errors";
import { colors, spacing } from "@/theme/tokens";

/** Every running guide, grouped by ladder level. */
export default function RunGuides() {
  const userId = useUserId();
  const guides = useRunGuides(userId);
  const isPremium = useIsPremium(userId);

  if (guides.isPending) return <LoadingView />;
  if (guides.isError) {
    return (
      <ErrorView message={toUserMessage(guides.error)} onRetry={() => void guides.refetch()} />
    );
  }

  return (
    <Screen>
      <BackButton />
      <AppText variant="title" accessibilityRole="header">
        Running guides
      </AppText>
      <AppText color="textMuted">
        Two-minute reads from your first run to your first marathon, each with one thing to try.
      </AppText>
      {RUN_LEVELS.map((level) => {
        const inLevel = guides.data.filter((g) => g.level === level);
        if (!inLevel.length) return null;
        const info = RUN_LEVEL_INFO[level];
        return (
          <Card key={level}>
            <AppText variant="heading">{info.name}</AppText>
            <AppText variant="caption" color="textMuted">
              {info.range}
            </AppText>
            {inLevel.map((guide) => {
              const locked = guide.isPremium && !isPremium;
              return (
                <Pressable
                  key={guide.id}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={`${guide.title}${locked ? ", Premium" : ""}`}
                  onPress={() =>
                    locked
                      ? openPaywall("run")
                      : router.push({
                          pathname: "/running/guide/[slug]",
                          params: { slug: guide.slug },
                        })
                  }
                >
                  <AppText style={styles.flex} color={locked ? "textMuted" : "text"}>
                    {guide.title}
                  </AppText>
                  {locked ? (
                    <AppText variant="caption" color="brand">
                      🔒 Premium
                    </AppText>
                  ) : (
                    <AppText color="textSubtle">›</AppText>
                  )}
                </Pressable>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  flex: { flex: 1 },
});
