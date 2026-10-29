import { describe, expect, it } from "vitest";
import { bodyShapes, capsulePath, floorShadow, PALETTE, smoothPath } from "../motion/body";
import { MOTIONS } from "../motion/motions";
import { frameAt } from "../motion/playback";
import { CANVAS, framing } from "../motion/skeleton";

const NUMBER = /-?\d+(\.\d+)?/g;

describe("athlete figure", () => {
  it("draws a tapered capsule as two tangents and two arcs", () => {
    const d = capsulePath({ x: 0, y: 0 }, { x: 10, y: 0 }, 2, 1);
    expect(d.match(/[MLAZ]/g)).toEqual(["M", "L", "A", "L", "A", "Z"]);
    // Every coordinate stays within the hull of the two end circles.
    const values = (d.match(NUMBER) ?? []).map(Number);
    expect(Math.max(...values)).toBeLessThanOrEqual(11);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-2);
  });

  it("falls back to a circle when one end swallows the other", () => {
    expect(capsulePath({ x: 5, y: 5 }, { x: 5, y: 5.5 }, 2, 1)).toContain("a 2 2 0 1 0 4 0");
  });

  it("joins outline points into one closed smooth curve through each of them", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const d = smoothPath(square);
    expect(d.startsWith("M 0.00 0.00")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(4);
    expect(d.endsWith("Z")).toBe(true);
    for (const p of square) expect(d).toContain(`${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    expect(smoothPath([])).toBe("");
  });

  it.each(Object.keys(MOTIONS))("%s renders a complete, finite athlete", (slug) => {
    const motion = MOTIONS[slug]!;
    const { anchorX } = framing(motion);
    for (const t of [0, motion.beat * 0.5, motion.beat, motion.beat * 1.7]) {
      const skeleton = frameAt(motion, t, anchorX);
      const shapes = bodyShapes(skeleton, motion.view);
      // Skin, hair, clothing and shoes are all present.
      const fills = new Set(shapes.map((s) => s.fill));
      for (const colour of [
        PALETTE.skin,
        PALETTE.top,
        PALETTE.shorts,
        PALETTE.shoe,
        PALETTE.hair,
      ]) {
        expect(fills.has(colour)).toBe(true);
      }
      for (const shape of shapes) {
        expect(shape.d.length).toBeGreaterThan(0);
        expect(shape.d.includes("NaN")).toBe(false);
      }
      const shadow = floorShadow(skeleton);
      expect(Number.isFinite(shadow.cx) && shadow.rx >= 7).toBe(true);
    }
  });

  it("never draws a shoe through the floor", () => {
    for (const motion of Object.values(MOTIONS)) {
      const { anchorX } = framing(motion);
      const s = frameAt(motion, 0, anchorX);
      for (const p of [s.heelNear, s.heelFar, s.toeNear, s.toeFar]) {
        expect(p.y).toBeLessThanOrEqual(CANVAS.floor + 1e-6);
      }
    }
  });
});
