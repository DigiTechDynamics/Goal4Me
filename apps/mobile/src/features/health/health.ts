import type { HealthStore } from "./health.types";

/** Web build: browsers have no health store. */
export const healthStore: HealthStore = {
  name: null,
  isAvailable: () => Promise.resolve(false),
  requestAccess: () => Promise.resolve(false),
  writeWeight: () => Promise.resolve(),
  writeWorkout: () => Promise.resolve(),
};

export { noonOf } from "./health.types";
