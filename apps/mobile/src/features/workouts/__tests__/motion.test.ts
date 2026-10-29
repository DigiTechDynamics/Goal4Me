import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MOTIONS } from "../motion/motions";
import { placeProp } from "../motion/props";
import { frameAt } from "../motion/playback";
import { CANVAS, framing, SEGMENT } from "../motion/skeleton";

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

  const plantedSlugs = Object.keys(MOTIONS).filter((slug) => MOTIONS[slug]!.planted);

  it("declares planted contacts for the exercises that need them", () => {
    for (const slug of [
      "push-up",
      "squat",
      "chair-dip",
      "glute-bridge",
      "cat-cow",
      "pike-push-up",
    ]) {
      expect(plantedSlugs).toContain(slug);
    }
  });

  it.each(plantedSlugs)("%s keeps its planted hands and feet still", (slug) => {
    const { motion, frames } = samples(slug);
    for (const joint of motion.planted!) {
      const start = frames[0]![joint];
      for (const frame of frames) {
        const p = frame[joint];
        expect(Math.hypot(p.x - start.x, p.y - start.y)).toBeLessThan(1.2);
      }
    }
  });

  it.each(plantedSlugs)("%s rests planted hands and feet on the floor", (slug) => {
    const { motion, frames } = samples(slug);
    const onProp = motion.prop?.joint;
    for (const joint of motion.planted!) {
      // Hands on a wall or chair seat, or whatever touches the prop, aren't on the floor.
      if (joint === onProp || (motion.prop && joint.startsWith("hand"))) continue;
      // Soles touch the floor; a flat palm puts the wrist just above it.
      const height = joint.startsWith("hand")
        ? 1.1
        : joint.startsWith("toe") || joint.startsWith("heel")
          ? 0
          : null;
      if (height === null) continue;
      expect(Math.abs(CANVAS.floor - frames[0]![joint].y - height)).toBeLessThan(0.6);
    }
  });

  it("loops seamlessly", () => {
    for (const slug of Object.keys(MOTIONS)) {
      const { motion, anchorX, loop } = samples(slug);
      expect(frameAt(motion, loop, anchorX)).toEqual(frameAt(motion, 0, anchorX));
    }
  });
});
