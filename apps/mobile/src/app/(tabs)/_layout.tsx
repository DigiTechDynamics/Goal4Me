import { Tabs } from "expo-router/js-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabIcon, type TabIconName } from "@/components/TabIcon";
import { Banner, Button } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useSyncPendingQuiz } from "@/features/onboarding/useSyncPendingQuiz";
import { colors, spacing } from "@/theme/tokens";

const TABS: { name: string; title: string; icon: TabIconName }[] = [
  { name: "index", title: "Today", icon: "today" },
  { name: "workouts", title: "Workouts", icon: "workouts" },
  { name: "progress", title: "Progress", icon: "progress" },
  { name: "money", title: "Money", icon: "money" },
  { name: "profile", title: "Profile", icon: "profile" },
];

export default function TabsLayout() {
  const userId = useUserId();
  const sync = useSyncPendingQuiz(userId);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      {sync.status === "error" ? (
        <View style={[styles.syncError, { paddingTop: insets.top + spacing.sm }]}>
          <Banner message="We couldn't save your quiz answers to your account." />
          <Button label="Try again" variant="secondary" onPress={sync.retry} />
        </View>
      ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  syncError: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
});
