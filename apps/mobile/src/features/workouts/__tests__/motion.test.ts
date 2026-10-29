import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MOTIONS } from "../motion/motions";
import { placeProp } from "../motion/props";
import { CANVAS, frameAt, framing, SEGMENT } from "../motion/skeleton";

/** Slugs of every exercise in the content library (read as text: the app doesn't bundle it). */
const librarySlugs = [
  ...readFileSync(
    resolve(__dirname, "../../../../../../packages/content/src/exercises.ts"),
    "utf8",
  ).matchAll(/slug: "([a-z0-9-]+)"/g),
].map((m) => m[1] as string);

/** Samples a motion's full loop, a dozen points per beat. */
function samples(slug: string) {
  const motion = MOTIONS[slug]!;
  const { anchorX, scale } = framing(motion);
  const loop = motion.beat * motion.frames.length;
  const times = Array.from({ length: motion.frames.length * 12 }, (_, i) => (i / 12) * motion.beat);
  return { motion, anchorX, scale, loop, frames: times.map((t) => frameAt(motion, t, anchorX)) };
}

describe("exercise animations", () => {
  it("cover every exercise in the library", () => {
    expect(librarySlugs.length).toBeGreaterThan(40);
    expect(librarySlugs.filter((slug) => !MOTIONS[slug])).toEqual([]);
  });

  it("have no motions for exercises that don't exist", () => {
    expect(Object.keys(MOTIONS).filter((slug) => !librarySlugs.includes(slug))).toEqual([]);
  });

  it.each(Object.keys(MOTIONS))("%s stays on the floor and inside the frame", (slug) => {
    const { scale, frames, anchorX, motion } = samples(slug);
    expect(scale).toBeGreaterThan(0.4);
    expect(scale).toBeLessThanOrEqual(1);
    const cx = CANVAS.width / 2;
    // Mirrors the renderer's transform: scale about the floor's centre.
    const toScreen = (p: { x: number; y: number }) => ({
      x: cx + (p.x - cx) * scale,
      y: CANVAS.floor + (p.y - CANVAS.floor) * scale,
    });
    for (const frame of frames) {
      for (const point of Object.values(frame)) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.y).toBeLessThanOrEqual(CANVAS.floor + 1e-6); // never through the floor
        const screen = toScreen(point);
        expect(screen.x).toBeGreaterThanOrEqual(0);
        expect(screen.x).toBeLessThanOrEqual(CANVAS.width);
        expect(screen.y - SEGMENT.headRadius).toBeGreaterThanOrEqual(-1);
      }
    }
    // Something must visibly move (holds "breathe" a little).
    if (motion.frames.length > 1) {
      const first = frames[0]!;
      const moved = frames.some((f) =>
        Object.keys(f).some((k) => {
          const a = f[k as keyof typeof f];
          const b = first[k as keyof typeof first];
          return Math.hypot(a.x - b.x, a.y - b.y) > 0.5;
        }),
      );
      expect(moved).toBe(true);
    }
    if (motion.prop) expect(placeProp(motion, anchorX)).not.toBeNull();
  });

  it("loops seamlessly", () => {
    for (const slug of Object.keys(MOTIONS)) {
      const { motion, anchorX, loop } = samples(slug);
      expect(frameAt(motion, loop, anchorX)).toEqual(frameAt(motion, 0, anchorX));
    }
  });
});
