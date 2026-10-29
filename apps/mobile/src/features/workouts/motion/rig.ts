import { FOOT, SEGMENT, type Limb, type Pair, type Pose } from "./skeleton";

/**
 * Authoring helpers for poses whose hands or feet must stay planted. Instead
 * of guessing limb angles, a pose says where the hips are and where each hand
 * or foot should be; two-bone inverse kinematics (the same maths a game
 * engine uses) works out the elbow and knee angles. That keeps a push-up's
 * hands and toes still while the body moves, whatever the body proportions.
 *
 * World coordinates for authoring: x forwards (the way the athlete faces) and
 * h = height above the floor, in canvas units. Side view only: from the front
 * an elbow or knee bends towards the viewer, which a 2D figure can't show.
 */
export type Vec = readonly [x: number, h: number];

/**
 * Where a wrist or ankle should be, for the limb to be solved. `bend`
 * overrides which way the middle joint goes (see `reach`).
 */
export type Target = { readonly at: Vec; readonly bend?: 1 | -1 };
export const at = (x: number, h: number, bend?: 1 | -1): Target =>
  bend ? { at: [x, h], bend } : { at: [x, h] };

/** Height of the ankle with the foot flat, and of the wrist with the palm flat. */
export const ANKLE_H = 1.9;
export const WRIST_H = 1.1;

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** The point `length` along `angle` from `from` (skeleton.ts angle convention). */
export function along(from: Vec, angle: number, length: number): Vec {
  return [from[0] + Math.sin(rad(angle)) * length, from[1] - Math.cos(rad(angle)) * length];
}

/** The angle pointing from `a` to `b`. */
export const angleOf = (a: Vec, b: Vec): number => deg(Math.atan2(b[0] - a[0], a[1] - b[1]));

const distance = (a: Vec, b: Vec) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Angles of a two-segment limb from `from` reaching `to`. `bend` picks the
 * side the middle joint goes: +1 for knees (they bend forwards of the line
 * from hip to ankle), -1 for elbows (behind the line from shoulder to wrist).
 * An unreachable target gets a straight limb pointing at it.
 */
export function reach(from: Vec, to: Vec, upper: number, lower: number, bend: 1 | -1): Limb {
  const d = Math.min(
    Math.max(distance(from, to), Math.abs(upper - lower) + 1e-6),
    upper + lower - 1e-6,
  );
  const base = angleOf(from, to);
  const cos = (upper * upper + d * d - lower * lower) / (2 * upper * d);
  const first = base + bend * deg(Math.acos(Math.min(1, Math.max(-1, cos))));
  return [first, angleOf(along(from, first, upper), to)];
}

/**
 * Where two circles meet: e.g. the shoulder of a straight body pivoting on
 * the toes (circle round the ankle) whose hands are planted (circle round the
 * wrist). `pick` chooses the higher or lower of the two crossings.
 */
export function meet(a: Vec, ra: number, b: Vec, rb: number, pick: "upper" | "lower"): Vec {
  const d = Math.min(distance(a, b), ra + rb - 1e-6);
  const along_ = (ra * ra - rb * rb + d * d) / (2 * d);
  const half = Math.sqrt(Math.max(0, ra * ra - along_ * along_));
  const ux = (b[0] - a[0]) / d;
  const uh = (b[1] - a[1]) / d;
  const base: Vec = [a[0] + ux * along_, a[1] + uh * along_];
  const one: Vec = [base[0] - uh * half, base[1] + ux * half];
  const two: Vec = [base[0] + uh * half, base[1] - ux * half];
  const upperFirst = one[1] >= two[1];
  return (pick === "upper") === upperFirst ? one : two;
}

export const LEG = SEGMENT.thigh + SEGMENT.shin;
export const ARM = SEGMENT.upperArm + SEGMENT.forearm;

/** Neck (= shoulder, in side view) of a torso starting at `hip`. */
export const neckOf = (hip: Vec, torso: number): Vec => along(hip, torso, SEGMENT.torso);

export interface Rig {
  /** Hip joint in world coordinates. */
  hip: Vec;
  torso: number;
  spine?: number;
  head?: number;
  armNear: Limb | Target;
  armFar: Limb | Target;
  legNear: Limb | Target;
  legFar: Limb | Target;
  ankles?: Pair;
  palms?: Pair;
  lift?: number;
}

// Not `"at" in limb`: arrays have an `at` method too.
const isTarget = (limb: Limb | Target): limb is Target => !Array.isArray(limb);

/** Solves a rig into an ordinary pose (angles plus the hip's x). */
export function rig(spec: Rig): Pose {
  const shoulder = neckOf(spec.hip, spec.torso);
  const arm = (limb: Limb | Target): Limb =>
    isTarget(limb)
      ? reach(shoulder, limb.at, SEGMENT.upperArm, SEGMENT.forearm, limb.bend ?? -1)
      : limb;
  const leg = (limb: Limb | Target): Limb =>
    isTarget(limb) ? reach(spec.hip, limb.at, SEGMENT.thigh, SEGMENT.shin, limb.bend ?? 1) : limb;
  const pose: Pose = {
    x: spec.hip[0],
    torso: spec.torso,
    armNear: arm(spec.armNear),
    armFar: arm(spec.armFar),
    legNear: leg(spec.legNear),
    legFar: leg(spec.legFar),
  };
  return {
    ...pose,
    ...(spec.spine !== undefined && { spine: spec.spine }),
    ...(spec.head !== undefined && { head: spec.head }),
    ...(spec.ankles && { ankles: spec.ankles }),
    ...(spec.palms && { palms: spec.palms }),
    ...(spec.lift !== undefined && { lift: spec.lift }),
  };
}

/**
 * A straight body (heels to shoulders) pivoting on the ankle at `ankle`,
 * with the shoulders at `shoulder`: the hip, torso angle and leg angle that
 * put it there. Used by every plank and push-up.
 */
export function straightBody(ankle: Vec, shoulder: Vec): { hip: Vec; torso: number; legs: Limb } {
  const torso = angleOf(ankle, shoulder);
  const hip = along(ankle, torso, LEG);
  const back = torso - 180;
  return { hip, torso, legs: [back, back] };
}

/**
 * Height the ankle must be at for the toes to touch the floor, given the
 * foot's absolute angle (e.g. 5 = toes pointing down in a plank, 30 = up on
 * the ball of the foot in a lunge). See FOOT in skeleton.ts.
 */
export function toeHeight(foot: number): number {
  return FOOT.toeForward * Math.cos(rad(foot)) + FOOT.toeDrop * Math.sin(rad(foot));
}

/** Ankle position for a foot up on its toes at `x`. */
export const onToes = (x: number, foot: number): Vec => [x, toeHeight(foot)];

/**
 * Sets each foot's ankle angle so it ends up at an absolute angle: 90 keeps
 * it flat on the floor however the shin leans, 180 points it up a wall.
 */
export function feet(pose: Pose, near: number, far: number = near): Pose {
  return { ...pose, ankles: [near - pose.legNear[1], far - pose.legFar[1]] };
}
