import {
  isHealthDataAvailableAsync,
  requestAuthorization,
  saveQuantitySample,
  saveWorkoutSample,
  WorkoutActivityType,
} from "@kingstinct/react-native-healthkit";
import { noonOf, type HealthStore } from "./health.types";

/** Apple Health (HealthKit). Write-only: we ask to share, never to read. */
const TO_SHARE = ["HKQuantityTypeIdentifierBodyMass", "HKWorkoutTypeIdentifier"] as const;

export const healthStore: HealthStore = {
  name: "Apple Health",

  isAvailable: () => isHealthDataAvailableAsync(),

  // iOS never reveals whether write access was granted (privacy), so a
  // completed request counts as connected; a refused write fails quietly later.
  requestAccess: () => requestAuthorization({ toShare: TO_SHARE }),

  async writeWeight({ id, measuredOn, weightKg }) {
    const at = noonOf(measuredOn);
    await saveQuantitySample("HKQuantityTypeIdentifierBodyMass", "kg", weightKg, at, at, {
      // HealthKit replaces a sample with the same sync identifier + higher version.
      HKMetadataKeySyncIdentifier: `goal4me-weight-${id}`,
      HKMetadataKeySyncVersion: Date.now(),
    });
  },

  async writeWorkout({ id, startedAt, durationSec, kcal, activity = "strength" }) {
    const start = new Date(startedAt);
    const end = new Date(start.getTime() + durationSec * 1000);
    await saveWorkoutSample(
      activity === "running"
        ? WorkoutActivityType.running
        : WorkoutActivityType.functionalStrengthTraining,
      [],
      start,
      end,
      { energyBurned: kcal },
      { HKMetadataKeySyncIdentifier: `goal4me-workout-${id}`, HKMetadataKeySyncVersion: 1 },
    );
  },
};

export { noonOf } from "./health.types";
