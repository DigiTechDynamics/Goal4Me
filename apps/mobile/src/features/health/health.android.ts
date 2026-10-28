import {
  ExerciseType,
  getSdkStatus,
  initialize,
  insertRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from "react-native-health-connect";
import { noonOf, type HealthStore } from "./health.types";

/** Health Connect (Android). Write-only permissions. */
let initialized = false;
async function ready(): Promise<boolean> {
  if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  initialized ||= await initialize();
  return initialized;
}

export const healthStore: HealthStore = {
  name: "Health Connect",

  isAvailable: ready,

  async requestAccess() {
    if (!(await ready())) return false;
    const granted = await requestPermission([
      { accessType: "write", recordType: "Weight" },
      { accessType: "write", recordType: "ExerciseSession" },
      { accessType: "write", recordType: "ActiveCaloriesBurned" },
    ]);
    return granted.some((p) => "recordType" in p && p.recordType === "Weight");
  },

  async writeWeight({ id, measuredOn, weightKg }) {
    if (!(await ready())) return;
    await insertRecords([
      {
        recordType: "Weight",
        time: noonOf(measuredOn).toISOString(),
        weight: { value: weightKg, unit: "kilograms" },
        // Same clientRecordId + higher version = update, never a duplicate.
        metadata: { clientRecordId: `goal4me-weight-${id}`, clientRecordVersion: Date.now() },
      },
    ]);
  },

  async writeWorkout({ id, startedAt, durationSec, kcal }) {
    if (!(await ready())) return;
    const start = new Date(startedAt);
    const end = new Date(start.getTime() + durationSec * 1000).toISOString();
    await insertRecords([
      {
        recordType: "ExerciseSession",
        exerciseType: ExerciseType.CALISTHENICS,
        title: "Goal4Me workout",
        startTime: start.toISOString(),
        endTime: end,
        metadata: { clientRecordId: `goal4me-workout-${id}`, clientRecordVersion: 1 },
      },
      {
        recordType: "ActiveCaloriesBurned",
        startTime: start.toISOString(),
        endTime: end,
        energy: { value: kcal, unit: "kilocalories" },
        metadata: { clientRecordId: `goal4me-kcal-${id}`, clientRecordVersion: 1 },
      },
    ]);
  },
};

export { noonOf } from "./health.types";
