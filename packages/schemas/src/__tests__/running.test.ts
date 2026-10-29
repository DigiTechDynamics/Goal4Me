import { describe, expect, it } from "vitest";
import { runLogSchema, runSettingsSchema } from "../index";

const valid = {
  program: "5k-to-10k",
  daysPerWeek: 3,
  runDays: [1, 3, 5],
  longRunDay: 5,
  startDate: "2026-11-02",
  raceDate: null,
  units: "km",
  targetSeconds: null,
};

describe("runSettingsSchema", () => {
  it("accepts valid settings", () => {
    expect(runSettingsSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    [{ program: "ultra" }, "program"],
    [{ runDays: [1, 1, 5] }, "runDays"],
    [{ daysPerWeek: 4 }, "runDays"],
    [{ longRunDay: 6 }, "longRunDay"],
    [{ raceDate: "2026-11-01" }, "raceDate"],
    [{ targetSeconds: 300 }, "targetSeconds"],
  ])("rejects %j", (change, path) => {
    const result = runSettingsSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe(path);
  });
});

describe("runLogSchema", () => {
  const log = {
    id: "8f9d2b4e-1c3a-4b5d-8e7f-9a0b1c2d3e4f",
    planId: "1f9d2b4e-1c3a-4b5d-8e7f-9a0b1c2d3e4f",
    runNumber: 4,
    week: 2,
    startedAt: "2026-11-09T06:30:00+02:00",
    durationSec: 1980,
    distanceM: 4200,
    effort: "just_right",
    notes: "  felt good ",
  };
  it("trims notes and accepts a missing distance", () => {
    expect(runLogSchema.parse(log).notes).toBe("felt good");
    expect(runLogSchema.safeParse({ ...log, distanceM: null }).success).toBe(true);
  });
  it("rejects impossible runs", () => {
    expect(runLogSchema.safeParse({ ...log, durationSec: 30 }).success).toBe(false);
    expect(runLogSchema.safeParse({ ...log, distanceM: 250_000 }).success).toBe(false);
  });
});
