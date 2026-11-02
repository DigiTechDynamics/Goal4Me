/**
 * A tiny 2D pose engine for the exercise animations (original artwork, no
 * video). A pose is a set of absolute limb angles; forward kinematics turns
 * it into joint positions, and frames between keyframes are interpolated.
 *
 * Angle convention (degrees, all segments): 0 = pointing straight down,
 * 90 = pointing the way the figure faces (screen right), 180 = up,
 * -90 = pointing behind (screen left). Absolute angles make poses easy to
 * author: "thigh 90" is a thigh parallel to the floor, whatever the torso does.
 * Poses that must keep hands or feet planted are solved in rig.ts.
 */
export type Limb = readonly [upper: number, lower: number];
export type Pair = readonly [near: number, far: number];

export interface Pose {
  /** Torso, from hips to neck (180 = upright). */
  torso: number;
  /**
   * How much the back curves, in canvas units at mid-back: positive rounds
   * it (a "cat" or a crunch), negative arches it (a "cow" or a cobra). The
   * hip-to-neck line is unchanged, so limbs attach in the same place.
   */
  spine?: number;
  /** Head tilt relative to the top of the spine (positive = chin up when upright). */
  head?: number;
  /** Near (screen-facing) arm and leg; drawn in front. */
  armNear: Limb;
  armFar: Limb;
  legNear: Limb;
  legFar: Limb;
  /** Foot angle relative to the shin: 90 = flat foot, less = pointed toes (calf raise). */
  ankles?: Pair;
  /** Absolute hand angles; default follows the forearm. 90 = flat, fingers forward. */
  palms?: Pair;
  /** Height above the floor of the lowest point (jumps). */
  lift?: number;
  /** Horizontal hip position, for motions with the "world" anchor (rig.ts). */
  x?: number;
}

export type View = "side" | "front";

export interface Motion {
  view: View;
  /** Keyframes played in order and looped; the last flows back to the first. */
  frames: readonly Pose[];
  /** Seconds per keyframe transition. */
  beat: number;
  /**
   * Joint kept still horizontally between frames (e.g. feet in a squat), or
   * "world" when every frame carries its own hip position (`Pose.x`).
   */
  anchor: JointName | "world";
  /**
   * Joints in contact with the floor or a prop for the whole loop. Playback
   * (playback.ts) locks them in place between keyframes.
   */
  planted?: readonly JointName[];
}

/**
 * Body proportions for an adult about 68 units tall: legs about half the
 * height, shoulders at about 82%, a head of about one-seventh.
 */
export const SEGMENT = {
  torso: 20,
  neck: 3,
  headRadius: 5,
  upperArm: 12.5,
  forearm: 10.5,
  /** Wrist to fingertips. */
  hand: 4.6,
  thigh: 16.5,
  shin: 16,
} as const;

/**
 * Shoe geometry around the ankle, along the foot (`f`) and towards the sole
 * (`s`, square to the foot: down when standing, up when lying face down
 * with the toes pointed). The heel and toe points are the sole's underside,
 * so they are what touches the floor.
 */
export const FOOT = { heelBack: 1.9, heelDrop: 1.9, toeForward: 5, toeDrop: 1.7 } as const;

/** Half the shoulder and hip widths when seen from the front. */
const SPREAD = { shoulder: 6.2, shoulderDrop: 1.2, hip: 3.6 } as const;

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
  | "footFar"
  | "toeNear"
  | "toeFar"
  | "heelNear"
  | "heelFar";

export type Point = { x: number; y: number };
export type Skeleton = Record<
  | JointName
  | "spine"
  | "shoulderNear"
  | "shoulderFar"
  | "hipNear"
  | "hipFar"
  | "fingersNear"
  | "fingersFar",
  Point
>;

/** Canvas the figure is drawn in (SVG viewBox units). */
export const CANVAS = { width: 120, height: 90, floor: 82 } as const;

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const direction = (angle: number): Point => ({ x: Math.sin(rad(angle)), y: Math.cos(rad(angle)) });
const step = (from: Point, angle: number, length: number): Point => {
  const d = direction(angle);
  return { x: from.x + d.x * length, y: from.y + d.y * length };
};
const add = (p: Point, v: Point, k: number): Point => ({ x: p.x + v.x * k, y: p.y + v.y * k });
/** Absolute angle of the vector `v` (the inverse of `direction`). */
const angleOfVector = (v: Point) => deg(Math.atan2(v.x, v.y));

/** Quarter turn of a direction towards its back side (for the torso: the back). */
export const backOf = (d: Point): Point => ({ x: d.y, y: -d.x });

/**
 * The spine as a quadratic curve from hip to neck through `mid`; returns its
 * control point (used for drawing and for the head's angle).
 */
export function spineControl(hip: Point, mid: Point, neck: Point): Point {
  return { x: 2 * mid.x - (hip.x + neck.x) / 2, y: 2 * mid.y - (hip.y + neck.y) / 2 };
}

function foot(ankle: Point, shin: number, flex: number, view: View) {
  if (view === "front") {
    // The foot points at the viewer, so only its depth below the ankle shows.
    const sole = add(ankle, direction(shin), FOOT.heelDrop + 0.7);
    return { heel: sole, toe: sole };
  }
  const f = direction(shin + flex);
  const s = direction(shin + flex - 90);
  return {
    heel: add(add(ankle, f, -FOOT.heelBack), s, FOOT.heelDrop),
    toe: add(add(ankle, f, FOOT.toeForward), s, FOOT.toeDrop),
  };
}

/** Joint positions for a pose with the hips at the origin. */
export function solve(pose: Pose, view: View): Skeleton {
  const hip = { x: 0, y: 0 };
  const up = direction(pose.torso);
  const neck = step(hip, pose.torso, SEGMENT.torso);
  const spine = add(add(hip, up, SEGMENT.torso / 2), backOf(up), pose.spine ?? 0);
  // The head follows the top of the spine's curve, so a rounded back drops it.
  const control = spineControl(hip, spine, neck);
  const topOfSpine = angleOfVector({ x: neck.x - control.x, y: neck.y - control.y });
  const head = step(neck, topOfSpine + (pose.head ?? 0), SEGMENT.neck + SEGMENT.headRadius);
  // Front view spreads shoulders and hips across the body; side view stacks them.
  const side = view === "front" ? { x: -up.y, y: up.x } : { x: 0, y: 0 };
  const shoulderDrop = view === "front" ? -SPREAD.shoulderDrop : 0;
  const shoulderNear = add(add(neck, side, SPREAD.shoulder), up, shoulderDrop);
  const shoulderFar = add(add(neck, side, -SPREAD.shoulder), up, shoulderDrop);
  const hipNear = add(hip, side, SPREAD.hip);
  const hipFar = add(hip, side, -SPREAD.hip);
  const elbowNear = step(shoulderNear, pose.armNear[0], SEGMENT.upperArm);
  const elbowFar = step(shoulderFar, pose.armFar[0], SEGMENT.upperArm);
  const handNear = step(elbowNear, pose.armNear[1], SEGMENT.forearm);
  const handFar = step(elbowFar, pose.armFar[1], SEGMENT.forearm);
  const kneeNear = step(hipNear, pose.legNear[0], SEGMENT.thigh);
  const kneeFar = step(hipFar, pose.legFar[0], SEGMENT.thigh);
  const footNear = step(kneeNear, pose.legNear[1], SEGMENT.shin);
  const footFar = step(kneeFar, pose.legFar[1], SEGMENT.shin);
  const [flexNear, flexFar] = pose.ankles ?? [90, 90];
  const near = foot(footNear, pose.legNear[1], flexNear, view);
  const far = foot(footFar, pose.legFar[1], flexFar, view);
  const [palmNear, palmFar] = pose.palms ?? [pose.armNear[1], pose.armFar[1]];
  return {
    hip,
    spine,
    neck,
    head,
    shoulderNear,
    shoulderFar,
    hipNear,
    hipFar,
    elbowNear,
    handNear,
    fingersNear: step(handNear, palmNear, SEGMENT.hand),
    elbowFar,
    handFar,
    fingersFar: step(handFar, palmFar, SEGMENT.hand),
    kneeNear,
    footNear,
    toeNear: near.toe,
    heelNear: near.heel,
    kneeFar,
    footFar,
    toeFar: far.toe,
    heelFar: far.heel,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPair = <T extends readonly [number, number]>(a: T, b: T, t: number) =>
  [lerp(a[0], b[0], t), lerp(a[1], b[1], t)] as const;

/** Smooth in-and-out, so movements ease into each position like a real rep. */
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function blend(a: Pose, b: Pose, t: number): Pose {
  const pose: Pose = {
    torso: lerp(a.torso, b.torso, t),
    spine: lerp(a.spine ?? 0, b.spine ?? 0, t),
    head: lerp(a.head ?? 0, b.head ?? 0, t),
    armNear: lerpPair(a.armNear, b.armNear, t),
    armFar: lerpPair(a.armFar, b.armFar, t),
    legNear: lerpPair(a.legNear, b.legNear, t),
    legFar: lerpPair(a.legFar, b.legFar, t),
    ankles: lerpPair(a.ankles ?? [90, 90], b.ankles ?? [90, 90], t),
    lift: lerp(a.lift ?? 0, b.lift ?? 0, t),
    x: lerp(a.x ?? 0, b.x ?? 0, t),
  };
  // Palms default to the forearm, so only blend them when a frame sets them.
  if (!a.palms && !b.palms) return pose;
  return {
    ...pose,
    palms: lerpPair(
      a.palms ?? [a.armNear[1], a.armFar[1]],
      b.palms ?? [b.armNear[1], b.armFar[1]],
      t,
    ),
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

/**
 * How far the body's surface reaches past each joint, so a figure lying down
 * rests on its back rather than sinking into the floor up to its spine.
 * Heels and toes are already the shoe's underside.
 */
const SURFACE: Partial<Record<keyof Skeleton, number>> = {
  head: SEGMENT.headRadius,
  neck: 2.4,
  spine: 3.4,
  hip: 4,
  shoulderNear: 2.5,
  shoulderFar: 2.5,
  hipNear: 3.4,
  hipFar: 3.4,
  elbowNear: 1.7,
  elbowFar: 1.7,
  handNear: 1.1,
  handFar: 1.1,
  fingersNear: 0.8,
  fingersFar: 0.8,
  kneeNear: 2.1,
  kneeFar: 2.1,
  footNear: 1.3,
  footFar: 1.3,
  heelNear: 0,
  heelFar: 0,
  toeNear: 0,
  toeFar: 0,
};

/** Every joint with how far the body reaches around it. */
export function extents(s: Skeleton): { p: Point; r: number }[] {
  return Object.entries(s).map(([name, p]) => ({ p, r: SURFACE[name as keyof Skeleton] ?? 0 }));
}

/**
 * Places a skeleton on the canvas: the body's lowest surface rests on the
 * floor (plus the pose's lift) and the anchor stays put horizontally, so feet
 * don't slide during a squat and hands don't slide during a push-up.
 */
export function place(
  skeleton: Skeleton,
  pose: Pose,
  anchor: Motion["anchor"],
  anchorX: number,
): Skeleton {
  const lowest = Math.max(...extents(skeleton).map(({ p, r }) => p.y + r));
  const dy = CANVAS.floor - (pose.lift ?? 0) - lowest;
  const dx = anchor === "world" ? anchorX + (pose.x ?? 0) : anchorX - skeleton[anchor].x;
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
  // Sample between keyframes too: a swinging limb can peak mid-transition.
  const steps = motion.frames.length * 4;
  for (let i = 0; i < steps; i++) {
    const pose = poseAt(motion, (i / 4) * motion.beat);
    const placed = place(solve(pose, motion.view), pose, motion.anchor, 0);
    for (const { p, r } of extents(placed)) {
      minX = Math.min(minX, p.x - r);
      maxX = Math.max(maxX, p.x + r);
      minY = Math.min(minY, p.y - r);
    }
  }
  const margin = 6;
  const width = maxX - minX;
  const height = CANVAS.floor - minY;
  const scale = Math.min(1, (CANVAS.width - 2 * margin) / width, (CANVAS.floor - margin) / height);
  return { anchorX: CANVAS.width / 2 - (minX + width / 2), scale };
}
