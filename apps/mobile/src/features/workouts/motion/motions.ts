import {
  ANKLE_H,
  ARM,
  LEG,
  WRIST_H,
  along,
  angleOf,
  at,
  feet,
  meet,
  neckOf,
  onToes,
  rig,
  straightBody,
  toeHeight,
  type Vec,
} from "./rig";
import {
  SEGMENT,
  type JointName,
  type Limb,
  type Motion,
  type Pair,
  type Pose,
  type View,
} from "./skeleton";

/**
 * Original looping animations for every exercise in the library, keyed by
 * exercise slug (see packages/content/src/exercises.ts). Each one is a few
 * keyframes; see skeleton.ts for the angle convention. Whenever a hand or
 * foot is on the floor, a wall or a chair, the pose is solved from where
 * that contact is (rig.ts), so it stays planted through the rep. Unit tests
 * check every library exercise has a motion and that `planted` joints never
 * slide.
 */

/** Optional scenery the figure works against. */
export type Prop = {
  kind: "wall" | "chair";
  joint: JointName;
  side: "front" | "back";
  /** For walls: distance from the joint to the wall's surface. */
  gap?: number;
};

export interface ExerciseMotion extends Motion {
  prop?: Prop;
}

const motion = (
  view: View,
  anchor: Motion["anchor"],
  beat: number,
  frames: Pose[],
  extra: Pick<ExerciseMotion, "prop" | "planted"> = {},
): ExerciseMotion => ({ view, anchor, beat, frames, ...extra });

// --- Standing building blocks ------------------------------------------------

const STAND: Pose = {
  x: 0,
  torso: 180,
  armNear: [5, 12],
  armFar: [-4, 4],
  legNear: [1, 0],
  legFar: [-1, 0],
};
const FRONT_STAND: Pose = {
  torso: 180,
  armNear: [12, 8],
  armFar: [-12, -8],
  legNear: [2, 0],
  legFar: [-2, 0],
};
const pose = (base: Pose, change: Partial<Pose>): Pose => ({ ...base, ...change });
/** Front view: the far side is the mirror image (negated angles). */
const mirror = (limb: Limb): Limb => [-limb[0], -limb[1]];
const frontArms = (limb: Limb) => ({ armNear: limb, armFar: mirror(limb) });
const frontLegs = (limb: Limb) => ({ legNear: limb, legFar: mirror(limb) });

/** Hands flat on the floor (or a seat), fingers pointing forwards. */
const FLAT_HANDS: Pair = [90, 90];
/** Arms straight overhead, as at the top of a jump. */
const REACH_UP: Pick<Pose, "armNear" | "armFar"> = { armNear: [172, 176], armFar: [168, 172] };

// --- Planks and push-ups -------------------------------------------------------

/** Wrists of every hands-down floor exercise sit here. */
const HANDS: Vec = [0, WRIST_H];
/** Toes-down feet in a plank: the foot's absolute angle. */
const TOES_DOWN = 5;
/** Shoulders straight over the wrists with the arms locked out. */
const LOCKED = WRIST_H + ARM - 0.05;
const BODY = LEG + SEGMENT.torso;

/**
 * Plank-line pose: a straight body from the toes (planted at `ankle`) to
 * the shoulders at height `shoulderH`, hands planted on the wrist points.
 */
function plankBody(ankle: Vec, shoulderH: number) {
  const rise = shoulderH - ankle[1];
  return straightBody(ankle, [ankle[0] + Math.sqrt(BODY * BODY - rise * rise), shoulderH]);
}

function plank(
  ankle: Vec,
  shoulderH: number,
  wrists: Vec = HANDS,
  change: Partial<Pose> = {},
): Pose {
  const body = plankBody(ankle, shoulderH);
  const solved = rig({
    hip: body.hip,
    torso: body.torso,
    armNear: at(wrists[0], wrists[1]),
    armFar: at(wrists[0] - 0.6, wrists[1]),
    legNear: body.legs,
    legFar: body.legs,
    palms: FLAT_HANDS,
  });
  return { ...feet(solved, TOES_DOWN), ...change };
}

/** Where the toes must be for a locked-out plank with shoulders over the hands. */
function plankAnkle(wrists: Vec = HANDS): Vec {
  const h = toeHeight(TOES_DOWN);
  return [wrists[0] - Math.sqrt(BODY * BODY - (LOCKED - h) ** 2), h];
}

const PLANK_ANKLE = plankAnkle();
const HIGH_PLANK = plank(PLANK_ANKLE, LOCKED);
/** Chest a fist's height from the floor. */
const LOW_PLANK = plank(PLANK_ANKLE, 8.5);

/**
 * Mountain climber: high plank with one knee driven in under the chest,
 * foot hovering; "switch" is the moment both feet pass in the air.
 */
function climber(driving: "near" | "far" | "switch"): Pose {
  const body = plankBody(PLANK_ANKLE, LOCKED);
  if (driving === "switch") {
    const passing = rig({
      hip: body.hip,
      torso: body.torso,
      armNear: at(HANDS[0], HANDS[1]),
      armFar: at(HANDS[0] - 0.6, HANDS[1]),
      legNear: at(body.hip[0] - 4, 5),
      legFar: at(body.hip[0] - 6, 5.5),
      palms: FLAT_HANDS,
    });
    return feet(passing, 30);
  }
  const knee = at(body.hip[0] + 13, 4.5);
  const back = at(PLANK_ANKLE[0], PLANK_ANKLE[1]);
  const solved = rig({
    hip: body.hip,
    torso: body.torso,
    armNear: at(HANDS[0], HANDS[1]),
    armFar: at(HANDS[0] - 0.6, HANDS[1]),
    legNear: driving === "near" ? knee : back,
    legFar: driving === "near" ? back : knee,
    palms: FLAT_HANDS,
  });
  return feet(solved, driving === "near" ? 40 : TOES_DOWN, driving === "near" ? TOES_DOWN : 40);
}

/** A straight body pivoting on the knees (knee push-up), shoulders at `shoulderH`. */
function kneePlank(knee: Vec, shoulderH: number): Pose {
  const length = SEGMENT.thigh + SEGMENT.torso;
  const rise = shoulderH - knee[1];
  const shoulder: Vec = [knee[0] + Math.sqrt(length * length - rise * rise), shoulderH];
  const torso = angleOf(knee, shoulder);
  return rig({
    hip: along(knee, torso, SEGMENT.thigh),
    torso,
    armNear: at(HANDS[0], HANDS[1]),
    armFar: at(HANDS[0] - 0.6, HANDS[1]),
    // Lower legs lifted off the floor behind, as most people do them.
    legNear: [torso - 180, -125],
    legFar: [torso - 180, -121],
    ankles: [100, 100],
    palms: FLAT_HANDS,
  });
}
const KNEE: Vec = [-Math.sqrt((SEGMENT.thigh + SEGMENT.torso) ** 2 - (LOCKED - 2.1) ** 2), 2.1];

// --- Squats and lunges ---------------------------------------------------------

/** Feet flat, hip-width (side view: almost on top of each other). */
const STANCE = { near: at(0.3, ANKLE_H), far: at(-0.3, ANKLE_H) };

/** A squat with hips at `hip` and the torso leaning to `torso`; heels stay down. */
function squatAt(hip: Vec, torso: number, arms: Pick<Pose, "armNear" | "armFar">): Pose {
  return feet(rig({ hip, torso, ...arms, legNear: STANCE.near, legFar: STANCE.far }), 90);
}
const SQUAT_BOTTOM = squatAt([-9, 17], 140, { armNear: [88, 88], armFar: [86, 86] });

/** Hands down by the feet, ready to jump back (burpee and squat thrust). */
const CROUCH = feet(
  rig({
    hip: [-8, 13],
    torso: 115,
    head: 10,
    armNear: at(11, WRIST_H),
    armFar: at(10.4, WRIST_H),
    legNear: STANCE.near,
    legFar: STANCE.far,
    palms: FLAT_HANDS,
  }),
  90,
);
/** The plank a burpee jumps back into: hands stay where the crouch put them. */
const BURPEE_PLANK = plank(plankAnkle([11, WRIST_H]), LOCKED, [11, WRIST_H]);

/** Split stance: front foot flat at 0, back foot on its toes 38 behind. */
function lunge(hip: Vec): Pose {
  const back = onToes(-38, 30);
  const solved = rig({
    hip,
    torso: 180,
    armNear: [8, 14],
    armFar: [-6, 0],
    legNear: STANCE.near,
    legFar: at(back[0], back[1]),
  });
  return { ...solved, ankles: [90 - solved.legNear[1], 30 - solved.legFar[1]] };
}
const LUNGE_BOTTOM = lunge([-16.5, 18.4]);
/** Halfway through a reverse lunge: weight on the front foot, back foot in the air. */
const STEP_BACK = feet(
  rig({
    hip: [-6, 31],
    torso: 180,
    armNear: [6, 12],
    armFar: [-5, 2],
    legNear: STANCE.near,
    legFar: at(-24, 8),
  }),
  90,
  60,
);

// --- On hands and knees ----------------------------------------------------------

const ALL_FOURS_HIP: Vec = [0, 2.1 + SEGMENT.thigh];
/** Knees under hips, hands under shoulders. */
function allFours(change: { spine?: number; head?: number } = {}): Pose {
  const torso = 103;
  const shoulder = neckOf(ALL_FOURS_HIP, torso);
  return rig({
    hip: ALL_FOURS_HIP,
    torso,
    ...change,
    armNear: at(shoulder[0] + 1, WRIST_H),
    armFar: at(shoulder[0] + 0.4, WRIST_H),
    legNear: [0, -88],
    legFar: [1, -87],
    ankles: [10, 10],
    palms: FLAT_HANDS,
  });
}

// --- On the back -------------------------------------------------------------------

/** Lying on the back, knees bent, feet flat at the origin; shoulders stay down. */
const BRIDGE_SHOULDER: Vec = [-36, 5];
function bridge(hipH: number, far?: "extended"): Pose {
  const rise = hipH - BRIDGE_SHOULDER[1];
  const hip: Vec = [BRIDGE_SHOULDER[0] + Math.sqrt(SEGMENT.torso ** 2 - rise * rise), hipH];
  const torso = angleOf(hip, BRIDGE_SHOULDER);
  const solved = rig({
    hip,
    torso,
    // Keep the head resting on the floor as the hips lift.
    head: -90 - torso,
    armNear: at(BRIDGE_SHOULDER[0] + 21.5, 1.3, 1),
    armFar: at(BRIDGE_SHOULDER[0] + 21, 1.3, 1),
    legNear: at(0.3, ANKLE_H),
    legFar: at(-0.3, ANKLE_H),
    palms: FLAT_HANDS,
  });
  const flat = feet(solved, 90);
  if (!far) return flat;
  // Single-leg version: the free leg straight, in line with the other thigh.
  const thigh = flat.legNear[0];
  return { ...flat, legFar: [thigh, thigh], ankles: [flat.ankles?.[0] ?? 90, 90] };
}

/** Lying on the back with the feet flat on a wall (wall glute bridge). */
const WALL_FEET: Vec = [16, 13];
function wallBridge(hipH: number): Pose {
  const shoulder: Vec = [-21, 5];
  const rise = hipH - shoulder[1];
  const hip: Vec = [shoulder[0] + Math.sqrt(SEGMENT.torso ** 2 - rise * rise), hipH];
  const torso = angleOf(hip, shoulder);
  const solved = rig({
    hip,
    torso,
    head: -90 - torso,
    armNear: at(shoulder[0] + 21.5, 1.3, 1),
    armFar: at(shoulder[0] + 21, 1.3, 1),
    palms: FLAT_HANDS,
    legNear: at(WALL_FEET[0], WALL_FEET[1]),
    legFar: at(WALL_FEET[0] - 0.5, WALL_FEET[1] - 0.4),
  });
  return feet(solved, 180); // soles flat against the wall
}

/** Lying on the back: shoulders sit a touch higher than hips, as the head rests on the floor. */
const ON_BACK = { torso: -93, armNear: [90, 90], armFar: [92, 92] } as const;
const TABLETOP: Pose = {
  ...ON_BACK,
  armNear: [180, 180],
  armFar: [176, 176],
  legNear: [180, 90],
  legFar: [176, 90],
};

/** Hands cupped behind the head, elbows wide (crunches). */
function handsBehindHead(base: Omit<Pose, "armNear" | "armFar">): Pose {
  const hip: Vec = [0, 4];
  const shoulder = neckOf(hip, base.torso);
  const head = along(shoulder, base.torso + (base.head ?? 0), SEGMENT.neck + SEGMENT.headRadius);
  return rig({
    ...base,
    hip,
    armNear: at(head[0] + 1.5, head[1] - 3),
    armFar: at(head[0] + 1, head[1] - 3.2),
    legNear: base.legNear,
    legFar: base.legFar,
  });
}

// --- Standing on one leg ---------------------------------------------------------

/** Quad stretch: standing on the far leg, near heel pulled to the glute by the near hand. */
function quadStretch(heel: number): Pose {
  const hip: Vec = [0, ANKLE_H + LEG - 0.1];
  const thigh = -4;
  const knee = along(hip, thigh, SEGMENT.thigh);
  const ankle = along(knee, heel, SEGMENT.shin);
  return feet(
    rig({
      hip,
      torso: 178,
      armNear: at(ankle[0] + 0.4, ankle[1] - 0.8),
      armFar: [78, 92],
      legNear: [thigh, heel],
      legFar: at(0.4, ANKLE_H),
    }),
    20,
    90,
  );
}

// --- Chair dip -----------------------------------------------------------------------

/** Hands on the seat's front edge; feet planted out in front, knees bent. */
const SEAT: Vec = [0, 17.5 + WRIST_H];
const DIP_FEET = { near: at(23, ANKLE_H), far: at(22.4, ANKLE_H) };
function dip(shoulder: Vec, torso: number): Pose {
  const hip = along(shoulder, torso + 180, SEGMENT.torso);
  return feet(
    rig({
      hip,
      torso,
      armNear: at(SEAT[0], SEAT[1]),
      armFar: at(SEAT[0] - 0.6, SEAT[1]),
      legNear: DIP_FEET.near,
      legFar: DIP_FEET.far,
      palms: FLAT_HANDS,
    }),
    90,
  );
}

// --- Pike push-up ----------------------------------------------------------------------

const PIKE_FEET: Vec = [0, ANKLE_H];
const PIKE_HANDS: Vec = [32, WRIST_H];
/** Upside-down V: straight legs and arms, hips at the top. */
function pike(shoulder?: Vec): Pose {
  const hip = shoulder
    ? meet(PIKE_FEET, LEG, shoulder, SEGMENT.torso, "upper")
    : meet(PIKE_FEET, LEG, PIKE_HANDS, SEGMENT.torso + ARM - 0.05, "upper");
  const torso = angleOf(hip, shoulder ?? PIKE_HANDS);
  const legs = angleOf(hip, PIKE_FEET);
  return feet(
    rig({
      hip,
      torso,
      head: 5,
      armNear: at(PIKE_HANDS[0], PIKE_HANDS[1]),
      armFar: at(PIKE_HANDS[0] - 0.6, PIKE_HANDS[1]),
      legNear: [legs, legs],
      legFar: [legs + 1, legs + 1],
      palms: FLAT_HANDS,
    }),
    90,
  );
}

// --- Wall push-up ----------------------------------------------------------------------

const WALL_HANDS: Vec = [40, 46];
const WALL_STANCE: Vec = [0, ANKLE_H];
function wallPushUp(reachToWall: number): Pose {
  const shoulder = meet(WALL_STANCE, BODY, WALL_HANDS, reachToWall, "upper");
  const body = straightBody(WALL_STANCE, shoulder);
  return feet(
    rig({
      hip: body.hip,
      torso: body.torso,
      armNear: at(WALL_HANDS[0], WALL_HANDS[1]),
      armFar: at(WALL_HANDS[0], WALL_HANDS[1] - 0.6),
      legNear: body.legs,
      legFar: [body.legs[0] + 1, body.legs[1] + 1],
      palms: [180, 180], // flat on the wall, fingers up
    }),
    90,
  );
}

// --- Prone ---------------------------------------------------------------------------------

const PRONE_HIP: Vec = [0, 4];
function cobra(torso: number, spine: number, head: number): Pose {
  return rig({
    hip: PRONE_HIP,
    torso,
    spine,
    head,
    armNear: at(16, WRIST_H),
    armFar: at(15.4, WRIST_H),
    legNear: [-84, -88],
    legFar: [-85, -89],
    ankles: [10, 10],
    palms: FLAT_HANDS,
  });
}

/** Forearm plank: elbows under the shoulders, forearms flat, toes down. */
function forearmPlank(spine: number): Pose {
  const shoulderH = 1.7 + SEGMENT.upperArm;
  const h = toeHeight(TOES_DOWN);
  const ankle: Vec = [-Math.sqrt(BODY * BODY - (shoulderH - h) ** 2), h];
  const body = straightBody(ankle, [0, shoulderH]);
  return feet(
    {
      x: body.hip[0],
      torso: body.torso,
      spine,
      armNear: [0, 90],
      armFar: [2, 90],
      legNear: body.legs,
      legFar: body.legs,
      palms: FLAT_HANDS,
    },
    TOES_DOWN,
  );
}

// --- Child's pose ----------------------------------------------------------------------------

const KNEELING: Vec = [0, 2.1];
function childsPose(spine: number): Pose {
  const hip: Vec = [-14, KNEELING[1] + Math.sqrt(SEGMENT.thigh ** 2 - 14 ** 2)];
  const thigh = angleOf(hip, KNEELING);
  return rig({
    hip,
    torso: 80,
    spine,
    head: 10,
    armNear: at(27, WRIST_H, 1),
    armFar: at(26.4, WRIST_H, 1),
    legNear: [thigh, -91],
    legFar: [thigh + 1, -90],
    ankles: [8, 8],
    palms: FLAT_HANDS,
  });
}

/** Standing forward fold: hips pushed back, soft knees, hands slid down to the shins. */
function hamstringFold(): Pose {
  const hip: Vec = [-5, 33.6];
  return feet(
    rig({
      hip,
      torso: 58,
      spine: 2.4,
      head: -8,
      armNear: at(3.4, 14),
      armFar: at(2.8, 14.5),
      legNear: STANCE.near,
      legFar: STANCE.far,
    }),
    90,
  );
}

export const MOTIONS: Record<string, ExerciseMotion> = {
  // --- Warm-up and cardio ----------------------------------------------------
  "march-in-place": motion("side", "hip", 0.35, [
    pose(STAND, { legNear: [80, 2], armNear: [-30, -10], armFar: [40, 95] }),
    STAND,
    pose(STAND, { legFar: [80, 2], armNear: [40, 95], armFar: [-30, -10] }),
    STAND,
  ]),
  "arm-circles": motion("front", "hip", 0.28, [
    pose(FRONT_STAND, frontArms([90, 90])),
    pose(FRONT_STAND, frontArms([100, 100])),
    pose(FRONT_STAND, frontArms([90, 90])),
    pose(FRONT_STAND, frontArms([80, 80])),
  ]),
  // Hands on hips; the hips trace a circle as the torso counter-leans.
  "hip-circles": motion("front", "footFar", 0.5, [
    pose(FRONT_STAND, { torso: 175, ...frontArms([40, -70]), legNear: [7, 3], legFar: [1, 1] }),
    pose(FRONT_STAND, { torso: 180, spine: 1, ...frontArms([40, -70]) }),
    pose(FRONT_STAND, { torso: 185, ...frontArms([40, -70]), legNear: [-1, -1], legFar: [-7, -3] }),
    pose(FRONT_STAND, { torso: 180, spine: -1, ...frontArms([40, -70]) }),
  ]),
  "step-touch": motion("front", "hip", 0.4, [
    pose(FRONT_STAND, { legNear: [16, 14], legFar: [-2, -2], ...frontArms([35, 70]) }),
    pose(FRONT_STAND, frontArms([20, 30])),
    pose(FRONT_STAND, { legNear: [2, 2], legFar: [-16, -14], ...frontArms([35, 70]) }),
    pose(FRONT_STAND, frontArms([20, 30])),
  ]),
  // Staggered stance, soft knees, guard up at the chin between punches.
  "boxing-punches": motion("side", "hip", 0.25, [
    pose(STAND, {
      torso: 174,
      armNear: [90, 90],
      armFar: [30, 165],
      legNear: [16, 6],
      legFar: [-14, -20],
    }),
    pose(STAND, {
      torso: 177,
      armNear: [30, 165],
      armFar: [26, 168],
      legNear: [16, 6],
      legFar: [-14, -20],
    }),
    pose(STAND, {
      torso: 174,
      armNear: [30, 165],
      armFar: [90, 90],
      legNear: [16, 6],
      legFar: [-14, -20],
    }),
    pose(STAND, {
      torso: 177,
      armNear: [30, 165],
      armFar: [26, 168],
      legNear: [16, 6],
      legFar: [-14, -20],
    }),
  ]),
  "jumping-jacks": motion("front", "hip", 0.28, [
    pose(FRONT_STAND, { ...frontArms([14, 10]), ...frontLegs([2, 2]) }),
    pose(FRONT_STAND, { ...frontArms([95, 100]), ...frontLegs([11, 11]), lift: 6 }),
    pose(FRONT_STAND, { ...frontArms([158, 170]), ...frontLegs([18, 18]) }),
    pose(FRONT_STAND, { ...frontArms([95, 100]), ...frontLegs([11, 11]), lift: 6 }),
  ]),
  // Knees to hip height, opposite arm driving, light on the balls of the feet.
  "high-knees": motion("side", "hip", 0.24, [
    pose(STAND, {
      legNear: [95, 8],
      legFar: [-4, -8],
      armNear: [-40, 20],
      armFar: [55, 150],
      ankles: [90, 60],
      lift: 2,
    }),
    pose(STAND, {
      legFar: [95, 8],
      legNear: [-4, -8],
      armNear: [55, 150],
      armFar: [-40, 20],
      ankles: [60, 90],
      lift: 2,
    }),
  ]),
  // Side to side: land on one leg, the other sweeps behind it.
  "skater-hops": motion("front", "hip", 0.35, [
    pose(FRONT_STAND, {
      torso: 170,
      legNear: [10, -4],
      legFar: [22, 36],
      armNear: [-35, -25],
      armFar: [-55, -45],
    }),
    pose(FRONT_STAND, { ...frontLegs([6, 2]), ...frontArms([12, 10]), lift: 7 }),
    pose(FRONT_STAND, {
      torso: 190,
      legFar: [-10, 4],
      legNear: [-22, -36],
      armFar: [35, 25],
      armNear: [55, 45],
    }),
    pose(FRONT_STAND, { ...frontLegs([6, 2]), ...frontArms([12, 10]), lift: 7 }),
  ]),
  // Stand, crouch with hands down, jump back to a plank, jump in, jump up.
  burpee: motion("side", "world", 0.42, [
    STAND,
    CROUCH,
    BURPEE_PLANK,
    CROUCH,
    pose(STAND, { ...REACH_UP, legNear: [3, 6], legFar: [0, 5], ankles: [40, 40], lift: 10 }),
  ]),
  "squat-thrust": motion("side", "world", 0.5, [STAND, CROUCH, BURPEE_PLANK, CROUCH]),

  // --- Upper body ------------------------------------------------------------
  "wall-push-up": motion("side", "world", 0.8, [wallPushUp(ARM - 0.3), wallPushUp(13)], {
    prop: { kind: "wall", joint: "handNear", side: "front", gap: 1.1 },
    planted: ["handNear", "handFar", "heelNear", "heelFar"],
  }),
  "knee-push-up": motion("side", "world", 0.8, [kneePlank(KNEE, LOCKED), kneePlank(KNEE, 8.5)], {
    planted: ["kneeNear", "handNear", "handFar"],
  }),
  "push-up": motion("side", "world", 0.75, [HIGH_PLANK, LOW_PLANK], {
    planted: ["handNear", "handFar", "toeNear", "toeFar"],
  }),
  // Hands together under the chest, elbows brushing the ribs.
  "diamond-push-up": motion(
    "side",
    "world",
    0.85,
    [
      plank(plankAnkle([-3, WRIST_H]), LOCKED, [-3, WRIST_H]),
      plank(plankAnkle([-3, WRIST_H]), 9.5, [-3, WRIST_H]),
    ],
    { planted: ["handNear", "handFar", "toeNear", "toeFar"] },
  ),
  "pike-push-up": motion("side", "world", 0.85, [pike(), pike([23.5, 14.5])], {
    planted: ["handNear", "handFar", "heelNear", "heelFar"],
  }),
  // Top: arms straight, hips just off the seat. Bottom: elbows bent straight
  // back, hips sinking towards the floor; hands and feet never move.
  "chair-dip": motion(
    "side",
    "world",
    0.8,
    [dip([3.5, SEAT[1] + ARM - 0.3], 182), dip([7, 31.5], 172)],
    {
      prop: { kind: "chair", joint: "handNear", side: "back" },
      planted: ["handNear", "heelNear", "toeNear"],
    },
  ),
  // W to Y: elbows bent at shoulder height, then arms slide overhead.
  "wall-angels": motion("front", "hip", 0.9, [
    pose(FRONT_STAND, frontArms([92, 180])),
    pose(FRONT_STAND, frontArms([150, 170])),
  ]),

  // --- Core -------------------------------------------------------------------
  // On the back, knees over hips: opposite arm and leg lower towards the floor.
  "dead-bug": motion("side", "hip", 0.7, [
    TABLETOP,
    pose(TABLETOP, { armNear: [-100, -100], legFar: [97, 97] }),
    TABLETOP,
    pose(TABLETOP, { armFar: [-100, -100], legNear: [97, 97] }),
  ]),
  // On all fours: opposite arm and leg reach long, back stays flat.
  "bird-dog": motion("side", "kneeNear", 0.8, [
    allFours(),
    { ...allFours(), armFar: [93, 93], legNear: [-93, -93], ankles: [80, 30] },
    allFours(),
    { ...allFours(), armNear: [93, 93], legFar: [-93, -93], ankles: [30, 80] },
  ]),
  "forearm-plank": motion("side", "world", 1.2, [forearmPlank(0), forearmPlank(0.8)], {
    planted: ["elbowNear", "toeNear"],
  }),
  // On one forearm, body in a straight line from feet to head.
  "side-plank": motion("front", "elbowFar", 1.1, [
    { torso: -108, armNear: [180, 180], armFar: [0, -90], legNear: [74, 74], legFar: [73, 73] },
    { torso: -105, armNear: [178, 178], armFar: [0, -90], legNear: [76, 76], legFar: [75, 75] },
  ]),
  // Shoulders curled up, elbow to the opposite knee as the other leg extends.
  "bicycle-crunch": motion("side", "hip", 0.45, [
    handsBehindHead({ torso: -116, spine: 1.5, head: 18, legNear: [145, 70], legFar: [100, 100] }),
    handsBehindHead({ torso: -116, spine: 1.5, head: 18, legNear: [100, 100], legFar: [145, 70] }),
  ]),
  // Straight legs from just off the floor to vertical; lower back stays down.
  "leg-raise": motion(
    "side",
    "hip",
    0.9,
    [
      { ...ON_BACK, legNear: [97, 97], legFar: [98, 98] },
      { ...ON_BACK, legNear: [178, 178], legFar: [177, 177] },
    ],
    { planted: ["neck"] },
  ),
  // Banana shape: lower back pressed down, shoulders and legs hovering.
  "hollow-hold": motion("side", "hip", 1.2, [
    {
      torso: -104,
      spine: 2.2,
      head: 12,
      armNear: [-110, -110],
      armFar: [-108, -108],
      legNear: [102, 102],
      legFar: [101, 101],
    },
    {
      torso: -103,
      spine: 2.4,
      head: 12,
      armNear: [-108, -108],
      armFar: [-106, -106],
      legNear: [100, 100],
      legFar: [99, 99],
    },
  ]),
  // From a high plank, knees drive in towards the chest one at a time.
  "mountain-climbers": motion(
    "side",
    "world",
    0.16,
    [climber("near"), climber("switch"), climber("far"), climber("switch")],
    {
      planted: ["handNear", "handFar"],
    },
  ),
  // High plank, hips still: one hand taps the opposite shoulder, then the other.
  "plank-shoulder-taps": motion(
    "side",
    "world",
    0.55,
    [
      HIGH_PLANK,
      { ...HIGH_PLANK, armNear: [-30, 150], palms: [150, 90] },
      HIGH_PLANK,
      { ...HIGH_PLANK, armFar: [-30, 150], palms: [90, 150] },
    ],
    { planted: ["toeNear", "toeFar"] },
  ),

  // --- Lower body ---------------------------------------------------------------
  "glute-bridge": motion("side", "world", 0.8, [bridge(4), bridge(13)], {
    planted: ["heelNear", "toeNear", "neck"],
  }),
  "wall-glute-bridge": motion("side", "world", 0.85, [wallBridge(4), wallBridge(12)], {
    prop: { kind: "wall", joint: "heelNear", side: "front" },
    planted: ["heelNear", "neck"],
  }),
  "single-leg-glute-bridge": motion(
    "side",
    "world",
    0.85,
    [{ ...bridge(4, "extended"), legFar: [140, 140] }, bridge(12.5, "extended")],
    { planted: ["heelNear", "toeNear", "neck"] },
  ),
  // Lying on one side, top leg lifts straight up and lowers with control.
  "side-leg-raise": motion("front", "hip", 0.8, [
    { torso: -90, armNear: [92, 92], armFar: [-150, -40], legNear: [92, 92], legFar: [90, 90] },
    { torso: -90, armNear: [92, 92], armFar: [-150, -40], legNear: [128, 128], legFar: [90, 90] },
  ]),
  // Rise onto the balls of the feet: heels lift, toes stay down.
  "calf-raise": motion(
    "side",
    "toeNear",
    0.6,
    [pose(STAND, { x: 0 }), pose(STAND, { x: 0, ankles: [52, 52] })],
    {
      planted: ["toeNear", "toeFar"],
    },
  ),
  // Hips back and down to thighs-parallel, chest up, heels down.
  squat: motion("side", "world", 0.8, [STAND, SQUAT_BOTTOM], {
    planted: ["heelNear", "toeNear", "heelFar", "toeFar"],
  }),
  // Back flat on the wall, thighs parallel, knees over ankles.
  "wall-sit": motion(
    "side",
    "world",
    1.2,
    [
      rig({
        hip: [0, 18],
        torso: 180,
        armNear: at(11, 21.5),
        armFar: at(10, 21.5),
        legNear: [90, 0],
        legFar: [89, 1],
      }),
      rig({
        hip: [0, 18],
        torso: 177,
        head: 4,
        armNear: at(12, 21),
        armFar: at(11, 21),
        legNear: [90, 0],
        legFar: [89, 1],
      }),
    ],
    {
      prop: { kind: "wall", joint: "hip", side: "back", gap: 4.2 },
      planted: ["heelNear", "toeNear"],
    },
  ),
  // Step back and sink until both knees are bent to about 90 degrees.
  "reverse-lunge": motion("side", "world", 0.55, [STAND, STEP_BACK, LUNGE_BOTTOM, STEP_BACK], {
    planted: ["heelNear", "toeNear"],
  }),
  // Feet stay split; lower straight down and push back up.
  "split-squat": motion("side", "world", 0.8, [lunge([-16, 28]), LUNGE_BOTTOM], {
    planted: ["heelNear", "toeNear", "toeFar"],
  }),
  // Squat, then drive up through the feet into a jump, arms swinging up.
  "squat-jump": motion("side", "world", 0.45, [
    squatAt([-9, 17], 135, { armNear: [-35, -25], armFar: [-38, -28] }),
    pose(STAND, { ...REACH_UP, legNear: [3, 6], legFar: [0, 5], ankles: [40, 40], lift: 11 }),
  ]),

  // --- Mobility and stretches ---------------------------------------------------
  // All fours: round the back up (cat, head down), then let it sag (cow, head up).
  "cat-cow": motion(
    "side",
    "world",
    1.2,
    [allFours({ spine: 3.6, head: -22 }), allFours({ spine: -2.8, head: 18 })],
    {
      planted: ["kneeNear", "handNear"],
    },
  ),
  // Hips back to heels, chest on thighs, arms long on the floor.
  "childs-pose": motion("side", "world", 1.6, [childsPose(1.8), childsPose(2.4)], {
    planted: ["kneeNear", "handNear"],
  }),
  // Soft knees, hinge at the hips and let the hands slide down the legs.
  "hamstring-stretch": motion("side", "world", 1.5, [STAND, hamstringFold()], {
    planted: ["heelNear", "heelFar"],
  }),
  "quad-stretch": motion("side", "world", 1.4, [quadStretch(-158), quadStretch(-162)], {
    planted: ["heelFar", "toeFar"],
  }),
  // Lying face down, hands under the shoulders: press the chest up, hips stay down.
  "cobra-stretch": motion("side", "world", 1.2, [cobra(93, 0, 0), cobra(124, -2.6, 16)], {
    planted: ["handNear", "hip"],
  }),
  // On the back, hips close to the wall, legs resting straight up it.
  "wall-hamstring-stretch": motion(
    "side",
    "hip",
    1.5,
    [
      { ...ON_BACK, legNear: [180, 180], legFar: [179, 179] },
      { ...ON_BACK, armNear: [91, 91], legNear: [178, 178], legFar: [177, 177] },
    ],
    { prop: { kind: "wall", joint: "kneeNear", side: "front", gap: 2.2 } },
  ),
};
