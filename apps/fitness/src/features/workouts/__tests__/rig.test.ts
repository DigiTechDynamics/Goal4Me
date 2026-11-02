import { describe, expect, it } from "vitest";
import {
  along,
  angleOf,
  feet,
  meet,
  onToes,
  reach,
  rig,
  straightBody,
  toeHeight,
  type Vec,
} from "../motion/rig";
import { CANVAS, place, SEGMENT, solve } from "../motion/skeleton";

const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("pose rig", () => {
  it("measures angles in the skeleton's convention", () => {
    expect(angleOf([0, 10], [0, 0])).toBeCloseTo(0); // straight down
    expect(angleOf([0, 0], [5, 0])).toBeCloseTo(90); // forwards
    expect(angleOf([0, 0], [0, 5])).toBeCloseTo(180); // up
    const p = along([1, 2], 90, 3);
    expect(p[0]).toBeCloseTo(4);
    expect(p[1]).toBeCloseTo(2);
  });

  it("solves a two-bone limb that ends exactly on its target", () => {
    const hip: Vec = [0, 30];
    const ankle: Vec = [6, 2];
    const [thigh, shin] = reach(hip, ankle, SEGMENT.thigh, SEGMENT.shin, 1);
    const knee = along(hip, thigh, SEGMENT.thigh);
    const end = along(knee, shin, SEGMENT.shin);
    expect(dist(end, ankle)).toBeLessThan(1e-6);
    // Knees bend forwards of the hip-to-ankle line.
    expect(knee[0]).toBeGreaterThan(3);
  });

  it("bends elbows backwards and straightens towards unreachable targets", () => {
    const shoulder: Vec = [0, 20];
    const [upper] = reach(shoulder, [0, 6], SEGMENT.upperArm, SEGMENT.forearm, -1);
    expect(along(shoulder, upper, SEGMENT.upperArm)[0]).toBeLessThan(0);
    const [a, b] = reach(shoulder, [0, -100], SEGMENT.upperArm, SEGMENT.forearm, -1);
    expect(a).toBeCloseTo(0, 1);
    expect(b).toBeCloseTo(0, 1);
  });

  it("finds where two circles meet", () => {
    const a: Vec = [0, 0];
    const b: Vec = [10, 0];
    const up = meet(a, 8, b, 6, "upper");
    const down = meet(a, 8, b, 6, "lower");
    for (const p of [up, down]) {
      expect(dist(p, a)).toBeCloseTo(8);
      expect(dist(p, b)).toBeCloseTo(6);
    }
    expect(up[1]).toBeGreaterThan(down[1]);
  });

  it("builds a straight plank line through ankle and shoulder", () => {
    const body = straightBody([-49, 5], [0, 24]);
    expect(body.legs[0]).toBeCloseTo(body.torso - 180);
    expect(dist(body.hip, [-49, 5])).toBeCloseTo(SEGMENT.thigh + SEGMENT.shin);
  });

  it("puts the toes on the floor for a foot up on its toes", () => {
    // Up on the ball of the foot, as in a lunge: the toes touch, the heel lifts.
    const ankle = onToes(-38, 30);
    const pose = feet(
      rig({
        hip: [-16, 18],
        torso: 180,
        armNear: [0, 0],
        armFar: [0, 0],
        legNear: [0, 0],
        legFar: { at: ankle },
      }),
      90,
      30,
    );
    const s = solve(pose, "side");
    const floor = s.hip.y + 18; // the rig's h = 0
    expect(s.toeFar.y).toBeCloseTo(floor, 5);
    expect(s.heelFar.y).toBeLessThan(floor - 1);
    expect(toeHeight(90)).toBeCloseTo(1.7); // flat foot: the toe sits a sole's depth down
  });

  it("turns a rig into a pose whose hands land where they were aimed", () => {
    const pose = rig({
      hip: [0, 18],
      torso: 103,
      armNear: { at: [20, 1.1] },
      armFar: [90, 90],
      legNear: [0, -90],
      legFar: [0, -90],
    });
    expect(pose.x).toBe(0);
    const s = solve(pose, "side");
    // Skeleton y runs down the screen; the rig's h runs up from the floor.
    expect(s.handNear.x - s.hip.x).toBeCloseTo(20, 5);
    expect(s.hip.y - s.handNear.y).toBeCloseTo(1.1 - 18, 5);
    expect(pose.armFar).toEqual([90, 90]);
  });

  it("sets ankle angles so feet stay flat however the shins lean", () => {
    const pose = feet(
      { torso: 180, armNear: [0, 0], armFar: [0, 0], legNear: [30, -20], legFar: [0, 10] },
      90,
    );
    expect(pose.ankles).toEqual([110, 80]);
    const placed = place(solve(pose, "side"), pose, "hip", 60);
    // Heel and toe of a flat foot sit level.
    expect(Math.abs(placed.heelFar.y - placed.toeFar.y)).toBeLessThan(0.3);
    expect(Math.max(placed.heelNear.y, placed.toeNear.y)).toBeLessThanOrEqual(CANVAS.floor + 1e-6);
  });
});
