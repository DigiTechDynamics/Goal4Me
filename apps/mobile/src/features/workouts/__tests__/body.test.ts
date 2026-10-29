import { describe, expect, it } from "vitest";
import { bodyShapes, capsulePath, floorShadow, PALETTE } from "../motion/body";
import { MOTIONS } from "../motion/motions";
import { CANVAS, frameAt, framing } from "../motion/skeleton";

const NUMBER = /-?\d+(\.\d+)?/g;

describe("athlete figure", () => {
  it("draws a tapered capsule as two tangents and two arcs", () => {
    const d = capsulePath({
      kind: "capsule",
      a: { x: 0, y: 0 },
      b: { x: 10, y: 0 },
      r1: 2,
      r2: 1,
      fill: "#000",
    });
    expect(d.match(/[MLAZ]/g)).toEqual(["M", "L", "A", "L", "A", "Z"]);
    // Every coordinate stays within the hull of the two end circles.
    const values = (d.match(NUMBER) ?? []).map(Number);
    expect(Math.max(...values)).toBeLessThanOrEqual(11);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-2);
  });

  it("falls back to a circle when one end swallows the other", () => {
    const d = capsulePath({
      kind: "capsule",
      a: { x: 5, y: 5 },
      b: { x: 5, y: 5.5 },
      r1: 2,
      r2: 1,
      fill: "#000",
    });
    expect(d).toContain("a 2 2 0 1 0 4 0");
  });

  it.each(Object.keys(MOTIONS))("%s renders a complete, finite athlete", (slug) => {
    const motion = MOTIONS[slug]!;
    const { anchorX } = framing(motion);
    for (const t of [0, motion.beat * 0.5, motion.beat, motion.beat * 1.7]) {
      const skeleton = frameAt(motion, t, anchorX);
      const shapes = bodyShapes(skeleton, motion.view);
      // Arms, legs, torso, head, clothing and shoes are all present.
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
        const d = shape.kind === "disc" ? "" : capsulePath(shape);
        expect(d.includes("NaN")).toBe(false);
        if (shape.kind === "capsule") {
          // Shoes and limbs may touch the floor but never go through it.
          expect(shape.a.y - shape.r1).toBeLessThanOrEqual(CANVAS.floor);
        }
      }
      const shadow = floorShadow(skeleton);
      expect(Number.isFinite(shadow.cx) && shadow.rx >= 7).toBe(true);
    }
  });
});
