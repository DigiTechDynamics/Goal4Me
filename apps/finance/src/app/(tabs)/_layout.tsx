import { useUserId } from "@goal4me/app-kit/auth/AuthProvider";
import { ErrorView, LoadingView } from "@goal4me/app-kit/components/StateViews";
import { TabIcon, type TabIconName } from "@goal4me/app-kit/components/TabIcon";
import { toUserMessage } from "@goal4me/app-kit/lib/errors";
import { colors } from "@goal4me/app-kit/theme/tokens";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useMoneyProfile } from "@/features/profile/api";

const TABS: { name: string; title: string; icon: TabIconName }[] = [
  { name: "index", title: "Budget", icon: "money" },
  { name: "learn", title: "Learn", icon: "learn" },
  { name: "profile", title: "Profile", icon: "profile" },
];

/**
 * The signed-in app. Every tab assumes the profile has a currency, so an
 * account that has not done the money setup yet is sent there first
 * (accounts created by the old combined quiz, or in Goal4Me Fit, already
 * have one and go straight in).
 */
export default function TabsLayout() {
  const userId = useUserId();
  const profile = useMoneyProfile(userId);

  if (profile.isPending) return <LoadingView />;
  if (profile.isError) {
    return (
      <ErrorView message={toUserMessage(profile.error)} onRetry={() => void profile.refetch()} />
    );
  }
  if (!profile.data.currency) return <Redirect href="/setup" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <TabIcon name={tab.icon} color={String(color)} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
