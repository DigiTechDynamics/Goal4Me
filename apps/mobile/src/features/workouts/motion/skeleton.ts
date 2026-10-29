/**
 * A tiny 2D pose engine for the exercise animations (original artwork, no
 * video). A pose is a set of absolute limb angles; forward kinematics turns
 * it into joint positions, and frames between keyframes are interpolated.
 *
 * Angle convention (degrees, all segments): 0 = pointing straight down,
 * 90 = pointing the way the figure faces (screen right), 180 = up,
 * -90 = pointing behind (screen left). Absolute angles make poses easy to
 * author: "thigh 90" is a thigh parallel to the floor, whatever the torso does.
 */
export type Limb = readonly [upper: number, lower: number];

export interface Pose {
  /** Torso, from hips to neck (180 = upright). */
  torso: number;
  /** Head tilt relative to the torso. */
  head?: number;
  /** Near (screen-facing) arm and leg; drawn in front. */
  armNear: Limb;
  armFar: Limb;
  legNear: Limb;
  legFar: Limb;
  /** Height above the floor of the lowest point (jumps). */
  lift?: number;
}

export type View = "side" | "front";

export interface Motion {
  view: View;
  /** Keyframes played in order and looped; the last flows back to the first. */
  frames: readonly Pose[];
  /** Seconds per keyframe transition. */
  beat: number;
  /** Joint kept still horizontally between frames (e.g. feet in a squat). */
  anchor: JointName;
}

export const SEGMENT = {
  torso: 26,
  neck: 4,
  headRadius: 5.5,
  upperArm: 12,
  forearm: 11,
  thigh: 15,
  shin: 15,
} as const;

export type JointName =
  | "hip"
  | "neck"
  | "head"
  | "elbowNear"
  | "handNear"
  | "elbowFar"
  | "handFar"
  | "kneeNear"
  | "footNear"
  | "kneeFar"
  | "footFar";

export type Point = { x: number; y: number };
export type Skeleton = Record<
  JointName | "shoulderNear" | "shoulderFar" | "hipNear" | "hipFar",
  Point
>;

/** Canvas the figure is drawn in (SVG viewBox units). */
export const CANVAS = { width: 120, height: 90, floor: 82 } as const;

const rad = (deg: number) => (deg * Math.PI) / 180;
const step = (from: Point, angle: number, length: number): Point => ({
  x: from.x + Math.sin(rad(angle)) * length,
  y: from.y + Math.cos(rad(angle)) * length,
});

/** Joint positions for a pose with the hips at the origin. */
export function solve(pose: Pose, view: View): Skeleton {
  const hip = { x: 0, y: 0 };
  const neck = step(hip, pose.torso, SEGMENT.torso);
  const head = step(neck, pose.torso + (pose.head ?? 0), SEGMENT.neck + SEGMENT.headRadius);
  // Front view spreads shoulders and hips; side view stacks them.
  const spread = view === "front" ? 1 : 0;
  const shoulderNear = { x: neck.x + 5 * spread, y: neck.y + 2 * spread };
  const shoulderFar = { x: neck.x - 5 * spread, y: neck.y + 2 * spread };
  const hipNear = { x: hip.x + 3.5 * spread, y: hip.y };
  const hipFar = { x: hip.x - 3.5 * spread, y: hip.y };
  const elbowNear = step(shoulderNear, pose.armNear[0], SEGMENT.upperArm);
  const elbowFar = step(shoulderFar, pose.armFar[0], SEGMENT.upperArm);
  const kneeNear = step(hipNear, pose.legNear[0], SEGMENT.thigh);
  const kneeFar = step(hipFar, pose.legFar[0], SEGMENT.thigh);
  return {
    hip,
    neck,
    head,
    shoulderNear,
    shoulderFar,
    hipNear,
    hipFar,
    elbowNear,
    handNear: step(elbowNear, pose.armNear[1], SEGMENT.forearm),
    elbowFar,
    handFar: step(elbowFar, pose.armFar[1], SEGMENT.forearm),
    kneeNear,
    footNear: step(kneeNear, pose.legNear[1], SEGMENT.shin),
    kneeFar,
    footFar: step(kneeFar, pose.legFar[1], SEGMENT.shin),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpLimb = (a: Limb, b: Limb, t: number): Limb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Smooth in-and-out, so movements ease into each position like a real rep. */
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head ?? 0, b.head ?? 0, t),
    armNear: lerpLimb(a.armNear, b.armNear, t),
    armFar: lerpLimb(a.armFar, b.armFar, t),
    legNear: lerpLimb(a.legNear, b.legNear, t),
    legFar: lerpLimb(a.legFar, b.legFar, t),
    lift: lerp(a.lift ?? 0, b.lift ?? 0, t),
  };
}

/** The interpolated pose at `seconds` into the looping motion. */
export function poseAt(motion: Motion, seconds: number): Pose {
  const count = motion.frames.length;
  const first = motion.frames[0];
  if (!first) throw new Error("motion has no frames");
  if (count === 1) return first;
  const position = (seconds / motion.beat) % count;
  const index = Math.floor(position);
  const from = motion.frames[index] ?? first;
  const to = motion.frames[(index + 1) % count] ?? first;
  return blend(from, to, ease(position - index));
}

const allPoints = (s: Skeleton): Point[] => Object.values(s);

const HEAD_EXTENT = SEGMENT.headRadius;

/**
 * Places a skeleton on the canvas: the lowest point rests on the floor (plus
 * the pose's lift) and the anchor joint stays at `anchorX`, so feet don't
 * slide during a squat and hands don't slide during a push-up.
 */
export function place(
  skeleton: Skeleton,
  pose: Pose,
  anchor: JointName,
  anchorX: number,
): Skeleton {
  const points = allPoints(skeleton);
  const lowest = Math.max(
    ...points.map((p) => p.y),
    skeleton.head.y + HEAD_EXTENT, // a head on the floor (lying down) counts too
  );
  const dy = CANVAS.floor - (pose.lift ?? 0) - lowest;
  const dx = anchorX - skeleton[anchor].x;
  return Object.fromEntries(
    Object.entries(skeleton).map(([name, p]) => [name, { x: p.x + dx, y: p.y + dy }]),
  ) as Skeleton;
}

/**
 * Where to pin the anchor so the whole motion is centred on the canvas,
 * plus a scale that keeps wide poses (lying down) inside it.
 */
export function framing(motion: Motion): { anchorX: number; scale: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const frame of motion.frames) {
    const placed = place(solve(frame, motion.view), frame, motion.anchor, 0);
    for (const p of allPoints(placed)) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
    }
    minY = Math.min(minY, placed.head.y - HEAD_EXTENT);
    minX = Math.min(minX, placed.head.x - HEAD_EXTENT);
    maxX = Math.max(maxX, placed.head.x + HEAD_EXTENT);
  }
  const margin = 8;
  const width = maxX - minX;
  const height = CANVAS.floor - minY;
  const scale = Math.min(1, (CANVAS.width - 2 * margin) / width, (CANVAS.floor - margin) / height);
  return { anchorX: CANVAS.width / 2 - (minX + width / 2), scale };
}

/** Everything the renderer needs for one moment of an exercise. */
export function frameAt(motion: Motion, seconds: number, anchorX: number): Skeleton {
  const pose = poseAt(motion, seconds);
  return place(solve(pose, motion.view), pose, motion.anchor, anchorX);
}
