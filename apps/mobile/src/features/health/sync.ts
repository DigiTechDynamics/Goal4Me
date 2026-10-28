import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { logger } from "@/lib/logger";
import { healthStore } from "./health";
import type { WeightEntry, WorkoutEntry } from "./health.types";

/**
 * Whether this device writes to the health store. Kept on the device (not
 * in the account) because Health permission is per device.
 */
interface HealthSettings {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useHealthSettings = create<HealthSettings>()(
  persist((set) => ({ enabled: false, setEnabled: (enabled) => set({ enabled }) }), {
    name: "goal4me.health.v1",
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
  }),
);

/**
 * Fire-and-forget writes: the health store is a bonus copy, so a failure
 * (permission revoked, Health Connect missing) is logged and never shown.
 */
function write(kind: string, run: () => Promise<void>): void {
  if (!useHealthSettings.getState().enabled) return;
  run().catch((error: unknown) =>
    logger.warn("health write failed", { kind, error: String(error) }),
  );
}

export const syncWeightToHealth = (entry: WeightEntry) =>
  write("weight", () => healthStore.writeWeight(entry));

export const syncWorkoutToHealth = (entry: WorkoutEntry) =>
  write("workout", () => healthStore.writeWorkout(entry));
