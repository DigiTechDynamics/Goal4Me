import { describe, expect, it } from "vitest";
import { buildChart, niceStep } from "../chart";

const box = { width: 300, height: 200, left: 40, right: 10, top: 10, bottom: 10 };

describe("niceStep", () => {
  it("rounds to 1, 2 or 5 times a power of ten", () => {
    expect(niceStep(4)).toBe(1);
    expect(niceStep(7)).toBe(2);
    expect(niceStep(18)).toBe(5);
    expect(niceStep(35)).toBe(10);
  });
});

describe("buildChart", () => {
  it("returns an empty chart for no data", () => {
    expect(buildChart([], box).path).toBe("");
  });

  it("spaces points by date and includes the goal in the range", () => {
    const chart = buildChart(
      [
        { date: "2026-10-01", value: 80 },
        { date: "2026-10-03", value: 79 },
        { date: "2026-10-11", value: 78 },
      ],
      box,
      74,
    );
    expect(chart.dots[0]!.x).toBe(40);
    expect(chart.dots[2]!.x).toBe(290);
    // 2 of 10 days → 20% of the 250px plot width.
    expect(chart.dots[1]!.x).toBe(90);
    expect(chart.min).toBeLessThanOrEqual(74);
    expect(chart.max).toBeGreaterThanOrEqual(80);
    expect(chart.goalY).not.toBeNull();
    expect(chart.path.startsWith("M40,")).toBe(true);
    // Lower weight is drawn lower on screen (larger y).
    expect(chart.dots[2]!.y).toBeGreaterThan(chart.dots[0]!.y);
  });

  it("centres a single point and gives a flat series a visible window", () => {
    const chart = buildChart([{ date: "2026-10-01", value: 70 }], box);
    expect(chart.dots[0]!.x).toBe(165);
    expect(chart.max - chart.min).toBeGreaterThanOrEqual(2);
    expect(chart.ticks.length).toBeGreaterThanOrEqual(3);
  });
});
