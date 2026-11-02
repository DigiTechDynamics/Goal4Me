import { Stack } from "expo-router";
import { colors } from "@goal4me/app-kit/theme/tokens";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="quiz" />
      {/* No swipe-back into the animation or away from the result. */}
      <Stack.Screen name="analysing" options={{ gestureEnabled: false, animation: "fade" }} />
      <Stack.Screen name="result" options={{ gestureEnabled: false, animation: "fade" }} />
    </Stack>
  );
}
