import { rootStackOptions } from "@goal4me/app-kit/app/AppRoot";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={rootStackOptions} />;
}
