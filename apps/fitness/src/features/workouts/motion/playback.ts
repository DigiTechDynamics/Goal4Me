import { reach, type Vec } from "./rig";
import {
  CANVAS,
  place,
  poseAt,
  SEGMENT,
  solve,
  type JointName,
  type Limb,
  type Motion,
  type Point,
  type Pose,
  type Skeleton,
} from "./skeleton";

/**
 * Playback: the skeleton for one moment of a motion. Keyframes blend by
 * angle, which is smooth but lets a planted hand or foot drift a little
 * mid-rep (two angles changing together don't keep the limb's end still).
 * So, like "foot locking" in game animation, each limb whose hand or foot is
 * planted is re-solved with inverse kinematics to end exactly where it was
 * in the first keyframe.
 */

type LimbKey = "armNear" | "armFar" | "legNear" | "legFar";

const LIMBS: readonly {
  key: LimbKey;
  root: keyof Skeleton;
  mid: keyof Skeleton;
  end: keyof Skeleton;
  /** Planted joints that belong to this limb's hand or foot. */
  contacts: readonly JointName[];
  /** Points of the hand or foot that must stay above the floor, with the body's thickness there. */
  surface: readonly (readonly [keyof Skeleton, number])[];
  lengths: readonly [number, number];
}[] = [
  {
    key: "armNear",
    root: "shoulderNear",
    mid: "elbowNear",
    end: "handNear",
    contacts: ["handNear"],
    surface: [
      ["handNear", 1.1],
      ["fingersNear", 0.8],
    ],
    lengths: [SEGMENT.upperArm, SEGMENT.forearm],
  },
  {
    key: "armFar",
    root: "shoulderFar",
    mid: "elbowFar",
    end: "handFar",
    contacts: ["handFar"],
    surface: [
      ["handFar", 1.1],
      ["fingersFar", 0.8],
    ],
    lengths: [SEGMENT.upperArm, SEGMENT.forearm],
  },
  {
    key: "legNear",
    root: "hipNear",
    mid: "kneeNear",
    end: "footNear",
    contacts: ["footNear", "toeNear", "heelNear"],
    surface: [
      ["toeNear", 0],
      ["heelNear", 0],
    ],
    lengths: [SEGMENT.thigh, SEGMENT.shin],
  },
  {
    key: "legFar",
    root: "hipFar",
    mid: "kneeFar",
    end: "footFar",
    contacts: ["footFar", "toeFar", "heelFar"],
    surface: [
      ["toeFar", 0],
      ["heelFar", 0],
    ],
    lengths: [SEGMENT.thigh, SEGMENT.shin],
  },
];

/** Joints that are part of a hand or foot; any other planted joint is a pivot (knees, neck, hips). */
const END_JOINTS = new Set<JointName>(LIMBS.flatMap((limb) => limb.contacts));

/** Which planted joint of a hand or foot to aim with: the sole's contact points first. */
const PRIORITY: readonly JointName[] = [
  "heelNear",
  "heelFar",
  "toeNear",
  "toeFar",
  "handNear",
  "handFar",
  "footNear",
  "footFar",
];

/** Screen point (y down) to the rig's world vector (h up); IK is translation-free. */
const toVec = (p: Point): Vec => [p.x, -p.y];

const translate = (s: Skeleton, dx: number, dy: number): Skeleton =>
  Object.fromEntries(
    Object.entries(s).map(([name, p]) => [name, { x: p.x + dx, y: p.y + dy }]),
  ) as Skeleton;

/** Which way the limb's middle joint currently bends, as `reach` expects it. */
function bendOf(root: Point, mid: Point, end: Point): 1 | -1 {
  // Cross product in world coordinates: positive means the middle joint is
  // clockwise from the root-to-end line, i.e. a larger angle (bend +1).
  const [ax, ah] = toVec(root);
  const [bx, bh] = toVec(end);
  const [mx, mh] = toVec(mid);
  const cross = (bx - ax) * (mh - ah) - (bh - ah) * (mx - ax);
  return cross > 0 ? 1 : -1;
}

/** Everything the renderer needs for one moment of an exercise. */
export function frameAt(motion: Motion, seconds: number, anchorX: number): Skeleton {
  const pose = poseAt(motion, seconds);
  const placed = place(solve(pose, motion.view), pose, motion.anchor, anchorX);
  const pins = motion.planted;
  const first = motion.frames[0];
  if (!pins?.length || !first || motion.view !== "side") return placed;

  const reference = place(solve(first, motion.view), first, motion.anchor, anchorX);
  // A planted pivot holds the whole body in place: a knee in a knee push-up,
  // the shoulders in a bridge, else the feet (a push-up rocks on its toes),
  // else the hands (mountain climbers).
  const pivot =
    pins.find((joint) => !END_JOINTS.has(joint)) ??
    pins.find((joint) => joint.startsWith("heel") || joint.startsWith("toe")) ??
    pins[0];
  const held = pivot
    ? translate(placed, reference[pivot].x - placed[pivot].x, reference[pivot].y - placed[pivot].y)
    : placed;

  // Each planted limb is re-aimed so its contact point (a heel, toes, a
  // palm) lands where it was; the foot's angle shifts the ankle a little, so
  // two rounds settle it.
  const limbs = LIMBS.filter((limb) => limb.contacts.some((joint) => pins.includes(joint)));
  let corrected: Pose = pose;
  let current = held;
  /** Re-solves one limb to end at `target`, keeping the foot's absolute angle. */
  const aim = (limb: (typeof LIMBS)[number], target: Point) => {
    const bend = bendOf(current[limb.root], current[limb.mid], current[limb.end]);
    const angles: Limb = reach(toVec(current[limb.root]), toVec(target), ...limb.lengths, bend);
    const previous = corrected[limb.key];
    corrected = { ...corrected, [limb.key]: angles };
    if (limb.key === "legNear" || limb.key === "legFar") {
      const index = limb.key === "legNear" ? 0 : 1;
      const ankles: [number, number] = [...(corrected.ankles ?? [90, 90])];
      ankles[index] += previous[1] - angles[1];
      corrected = { ...corrected, ankles };
    }
  };
  const resolve = () => {
    const solved = solve(corrected, motion.view);
    current = translate(solved, held.hip.x - solved.hip.x, held.hip.y - solved.hip.y);
  };

  for (let round = 0; round < 2 && limbs.length; round++) {
    for (const limb of limbs) {
      const contact = PRIORITY.find(
        (joint) => limb.contacts.includes(joint) && pins.includes(joint),
      );
      if (!contact) continue;
      const offset = {
        x: current[contact].x - current[limb.end].x,
        y: current[contact].y - current[limb.end].y,
      };
      aim(limb, { x: reference[contact].x - offset.x, y: reference[contact].y - offset.y });
    }
    resolve();
  }

  // With the body held by its pivot, a free foot or hand swinging past the
  // floor (mountain climbers, stepping back into a lunge) is lifted onto it.
  for (let round = 0; round < 3; round++) {
    let lifted = false;
    for (const limb of LIMBS) {
      if (limbs.includes(limb)) continue;
      const sink = Math.max(
        ...limb.surface.map(([joint, r]) => current[joint].y + r - CANVAS.floor),
      );
      if (sink <= 1e-6) continue;
      const end = current[limb.end];
      aim(limb, { x: end.x, y: end.y - sink });
      lifted = true;
    }
    if (!lifted) break;
    resolve();
  }
  return current;
}
