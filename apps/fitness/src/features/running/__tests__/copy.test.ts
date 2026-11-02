import { describe, expect, it } from "vitest";
import { DEFAULT_RUN_DAYS, formatClock, parseFinishTime, spokenDuration } from "../copy";

describe("running copy", () => {
  it("parses finish times", () => {
    expect(parseFinishTime("25:00")).toBe(1500);
    expect(parseFinishTime("1:45:30")).toBe(6330);
    expect(parseFinishTime("45")).toBe(2700);
    expect(parseFinishTime("")).toBeNull();
    expect(parseFinishTime("25:75")).toBeNull();
    expect(parseFinishTime("fast")).toBeNull();
  });
  it("formats clocks and spoken durations", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(6330)).toBe("1:45:30");
    expect(spokenDuration(90)).toBe("1 minute 30 seconds");
    expect(spokenDuration(1200)).toBe("20 minutes");
  });
  it("has default run days for every frequency", () => {
    for (const [days, picks] of Object.entries(DEFAULT_RUN_DAYS)) {
      expect(new Set(picks).size).toBe(Number(days));
      expect(picks).toContain(5); // long run on Saturday
    }
  });
});
