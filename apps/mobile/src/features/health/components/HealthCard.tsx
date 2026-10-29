import { useEffect, useState } from "react";
import { AppText, Banner, Button, Card } from "@/components/ui";
import { track } from "@/lib/analytics";
import { healthStore } from "../health";
import { useHealthSettings } from "../sync";

/**
 * Profile: connect Apple Health / Health Connect. Hidden on the web and on
 * devices without a health store (e.g. Android without Health Connect).
 */
export function HealthCard() {
  const { enabled, setEnabled } = useHealthSettings();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    healthStore
      .isAvailable()
      .then((ok) => active && setAvailable(ok))
      .catch(() => active && setAvailable(false));
    return () => {
      active = false;
    };
  }, []);

  if (!healthStore.name || !available) return null;

  const connect = async () => {
    setConnecting(true);
    setDenied(false);
    try {
      const granted = await healthStore.requestAccess();
      setEnabled(granted);
      setDenied(!granted);
      if (granted) track("health_connected", { platform: healthStore.name ?? "unknown" });
    } catch {
      setDenied(true);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card>
      <AppText variant="overline" color={enabled ? "brand" : "textMuted"}>
        {healthStore.name}
      </AppText>
      <AppText color="textMuted">
        {enabled
          ? `Your weigh-ins and workouts are also saved to ${healthStore.name}.`
          : `Save your weigh-ins and workouts to ${healthStore.name}, so your other apps and devices see them too.`}
      </AppText>
      {denied ? (
        <Banner
          tone="warning"
          message={`Goal4Me wasn't given access. You can allow it in ${healthStore.name}'s settings.`}
        />
      ) : null}
      {enabled ? (
        <Button label="Stop saving" variant="ghost" onPress={() => setEnabled(false)} />
      ) : (
        <Button
          label={`Connect ${healthStore.name}`}
          variant="secondary"
          loading={connecting}
          onPress={() => void connect()}
        />
      )}
    </Card>
  );
}
