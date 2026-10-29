import type { JointName, Limb, Motion, Pose, View } from "./skeleton";

/**
 * Original looping animations for every exercise in the library, keyed by
 * exercise slug (see packages/content/src/exercises.ts). Each one is a few
 * hand-authored keyframes; see skeleton.ts for the angle convention.
 * A unit test checks every library exercise has a motion here.
 */

/** Optional scenery the figure works against. */
export type Prop = { kind: "wall" | "chair"; joint: JointName; side: "front" | "back" };

export interface ExerciseMotion extends Motion {
  prop?: Prop;
}

// --- Building blocks -------------------------------------------------------

const STAND: Pose = {
  torso: 180,
  armNear: [6, 4],
  armFar: [-6, -4],
  legNear: [2, 0],
  legFar: [-2, 0],
};
const FRONT_STAND: Pose = {
  torso: 180,
  armNear: [12, 8],
  armFar: [-12, -8],
  legNear: [3, 0],
  legFar: [-3, 0],
};
const pose = (base: Pose, change: Partial<Pose>): Pose => ({ ...base, ...change });
/** Front view: the far side is the mirror image (negated angles). */
const both = (limb: Limb): { near: Limb; far: Limb } => ({ near: limb, far: [-limb[0], -limb[1]] });
const frontArms = (limb: Limb) => ({ armNear: both(limb).near, armFar: both(limb).far });
const frontLegs = (limb: Limb) => ({ legNear: both(limb).near, legFar: both(limb).far });

const motion = (
  view: View,
  anchor: JointName,
  beat: number,
  frames: Pose[],
  prop?: Prop,
): ExerciseMotion => (prop ? { view, anchor, beat, frames, prop } : { view, anchor, beat, frames });

// Floor positions reused by several exercises.
const HIGH_PLANK: Pose = {
  torso: 102,
  armNear: [0, 0],
  armFar: [4, 4],
  legNear: [-78, -78],
  legFar: [-78, -78],
};
const LOW_PLANK: Pose = {
  torso: 95,
  armNear: [-55, 8],
  armFar: [-50, 10],
  legNear: [-85, -85],
  legFar: [-85, -85],
};
const SQUAT_HANDS_DOWN: Pose = {
  torso: 125,
  head: -10,
  armNear: [10, 8],
  armFar: [14, 10],
  legNear: [105, -25],
  legFar: [100, -22],
};
const DEEP_SQUAT: Pose = {
  torso: 145,
  armNear: [92, 92],
  armFar: [88, 88],
  legNear: [85, -22],
  legFar: [82, -20],
};
const ALL_FOURS: Pose = {
  torso: 90,
  armNear: [0, 0],
  armFar: [3, 3],
  legNear: [0, -90],
  legFar: [3, -88],
};
const ON_BACK: Pose = {
  torso: -90,
  armNear: [90, 90],
  armFar: [92, 92],
  legNear: [135, 15],
  legFar: [132, 18],
};
const BRIDGE: Pose = {
  torso: -68,
  armNear: [90, 90],
  armFar: [92, 92],
  legNear: [112, 2],
  legFar: [110, 4],
};
const TABLETOP: Pose = {
  torso: -90,
  armNear: [180, 180],
  armFar: [176, 176],
  legNear: [180, 90],
  legFar: [176, 90],
};

export const MOTIONS: Record<string, ExerciseMotion> = {
  // --- Warm-up and cardio ----------------------------------------------------
  "march-in-place": motion("side", "hip", 0.45, [
    pose(STAND, { legNear: [80, 0], armNear: [-30, -15], armFar: [40, 90] }),
    pose(STAND, { legFar: [80, 0], armNear: [40, 90], armFar: [-30, -15] }),
  ]),
  "arm-circles": motion("front", "hip", 0.28, [
    pose(FRONT_STAND, frontArms([90, 90])),
    pose(FRONT_STAND, frontArms([100, 100])),
    pose(FRONT_STAND, frontArms([90, 90])),
    pose(FRONT_STAND, frontArms([80, 80])),
  ]),
  "hip-circles": motion("front", "footFar", 0.5, [
    pose(FRONT_STAND, { torso: 174, ...frontArms([45, -60]), legNear: [8, 4], legFar: [-1, -1] }),
    pose(FRONT_STAND, { torso: 180, ...frontArms([45, -60]), lift: 0 }),
    pose(FRONT_STAND, { torso: 186, ...frontArms([45, -60]), legNear: [1, 1], legFar: [-8, -4] }),
    pose(FRONT_STAND, { torso: 180, ...frontArms([45, -60]) }),
  ]),
  "step-touch": motion("front", "hip", 0.4, [
    pose(FRONT_STAND, { legNear: [16, 16], legFar: [-2, -2], ...frontArms([35, 70]) }),
    pose(FRONT_STAND, frontArms([20, 30])),
    pose(FRONT_STAND, { legNear: [2, 2], legFar: [-16, -16], ...frontArms([35, 70]) }),
    pose(FRONT_STAND, frontArms([20, 30])),
  ]),
  "boxing-punches": motion("side", "hip", 0.25, [
    pose(STAND, {
      torso: 176,
      armNear: [90, 90],
      armFar: [35, 160],
      legNear: [14, 14],
      legFar: [-14, -14],
    }),
    pose(STAND, {
      torso: 178,
      armNear: [35, 160],
      armFar: [30, 165],
      legNear: [14, 14],
      legFar: [-14, -14],
    }),
    pose(STAND, {
      torso: 176,
      armNear: [35, 160],
      armFar: [90, 90],
      legNear: [14, 14],
      legFar: [-14, -14],
    }),
    pose(STAND, {
      torso: 178,
      armNear: [35, 160],
      armFar: [30, 165],
      legNear: [14, 14],
      legFar: [-14, -14],
    }),
  ]),
  "jumping-jacks": motion("front", "hip", 0.28, [
    pose(FRONT_STAND, { ...frontArms([14, 10]), ...frontLegs([3, 3]) }),
    pose(FRONT_STAND, { ...frontArms([95, 100]), ...frontLegs([12, 12]), lift: 6 }),
    pose(FRONT_STAND, { ...frontArms([155, 168]), ...frontLegs([20, 20]) }),
    pose(FRONT_STAND, { ...frontArms([95, 100]), ...frontLegs([12, 12]), lift: 6 }),
  ]),
  "high-knees": motion("side", "hip", 0.24, [
    pose(STAND, {
      legNear: [100, 5],
      legFar: [-4, -8],
      armNear: [-40, 20],
      armFar: [60, 150],
      lift: 2,
    }),
    pose(STAND, {
      legFar: [100, 5],
      legNear: [-4, -8],
      armNear: [60, 150],
      armFar: [-40, 20],
      lift: 2,
    }),
  ]),
  "skater-hops": motion("front", "hip", 0.35, [
    pose(FRONT_STAND, {
      torso: 168,
      legNear: [6, -8],
      legFar: [25, 40],
      armNear: [-35, -30],
      armFar: [-50, -40],
    }),
    pose(FRONT_STAND, { ...frontLegs([8, 8]), ...frontArms([10, 10]), lift: 7 }),
    pose(FRONT_STAND, {
      torso: 192,
      legFar: [-6, 8],
      legNear: [-25, -40],
      armFar: [35, 30],
      armNear: [50, 40],
    }),
    pose(FRONT_STAND, { ...frontLegs([8, 8]), ...frontArms([10, 10]), lift: 7 }),
  ]),
  burpee: motion("side", "hip", 0.45, [
    STAND,
    SQUAT_HANDS_DOWN,
    HIGH_PLANK,
    SQUAT_HANDS_DOWN,
    pose(STAND, {
      armNear: [170, 175],
      armFar: [166, 172],
      legNear: [4, 8],
      legFar: [0, 6],
      lift: 10,
    }),
  ]),
  "squat-thrust": motion("side", "hip", 0.55, [
    STAND,
    SQUAT_HANDS_DOWN,
    pose(SQUAT_HANDS_DOWN, { torso: 108, legFar: [-78, -78] }),
    HIGH_PLANK,
    pose(SQUAT_HANDS_DOWN, { torso: 108, legFar: [-78, -78] }),
    SQUAT_HANDS_DOWN,
  ]),

  // --- Upper body ------------------------------------------------------------
  "wall-push-up": motion(
    "side",
    "handNear",
    0.8,
    [
      {
        torso: 150,
        armNear: [112, 112],
        armFar: [108, 108],
        legNear: [-30, -30],
        legFar: [-28, -28],
      },
      {
        torso: 140,
        armNear: [40, 150],
        armFar: [38, 148],
        legNear: [-40, -40],
        legFar: [-38, -38],
      },
    ],
    { kind: "wall", joint: "handNear", side: "front" },
  ),
  "knee-push-up": motion("side", "handNear", 0.8, [
    { torso: 110, armNear: [0, 0], armFar: [4, 4], legNear: [-62, -100], legFar: [-60, -98] },
    { torso: 98, armNear: [-55, 6], armFar: [-50, 8], legNear: [-72, -100], legFar: [-70, -98] },
  ]),
  "push-up": motion("side", "handNear", 0.75, [HIGH_PLANK, LOW_PLANK]),
  "diamond-push-up": motion("side", "handNear", 0.85, [
    HIGH_PLANK,
    pose(LOW_PLANK, { armNear: [-68, 2], armFar: [-64, 4] }),
  ]),
  "pike-push-up": motion("side", "handNear", 0.85, [
    {
      torso: 32,
      head: 10,
      armNear: [32, 32],
      armFar: [34, 34],
      legNear: [-32, -32],
      legFar: [-30, -30],
    },
    {
      torso: 50,
      head: 15,
      armNear: [-35, 20],
      armFar: [-32, 22],
      legNear: [-28, -28],
      legFar: [-26, -26],
    },
  ]),
  "chair-dip": motion(
    "side",
    "handNear",
    0.8,
    [
      // Hands on the seat edge behind, hips in front of the chair. Top: arms
      // straight. Bottom: elbows bent straight back to about 90 degrees, hips
      // sinking towards the floor. Leg angles are solved so the hands stay on
      // the seat and the feet stay planted.
      { torso: 180, armNear: [-12, -6], armFar: [-10, -5], legNear: [72, 8], legFar: [70, 9] },
      {
        torso: 178,
        armNear: [-95, -3],
        armFar: [-93, -2],
        legNear: [120, -18],
        legFar: [118, -17],
      },
    ],
    { kind: "chair", joint: "handNear", side: "back" },
  ),
  "wall-angels": motion("front", "hip", 0.9, [
    pose(FRONT_STAND, frontArms([92, 180])),
    pose(FRONT_STAND, frontArms([150, 170])),
  ]),

  // --- Core -------------------------------------------------------------------
  "dead-bug": motion("side", "hip", 0.7, [
    TABLETOP,
    pose(TABLETOP, { armNear: [-100, -100], legFar: [96, 96] }),
    TABLETOP,
    pose(TABLETOP, { armFar: [-100, -100], legNear: [96, 96] }),
  ]),
  "bird-dog": motion("side", "kneeNear", 0.8, [
    ALL_FOURS,
    pose(ALL_FOURS, { armFar: [92, 92], legNear: [-92, -92] }),
    ALL_FOURS,
    pose(ALL_FOURS, { armNear: [92, 92], legFar: [-92, -92] }),
  ]),
  "forearm-plank": motion("side", "elbowNear", 1.2, [
    { torso: 97, armNear: [0, 90], armFar: [4, 92], legNear: [-82, -82], legFar: [-82, -82] },
    { torso: 99, armNear: [0, 90], armFar: [4, 92], legNear: [-81, -81], legFar: [-81, -81] },
  ]),
  "side-plank": motion("front", "footNear", 1.1, [
    { torso: -112, armNear: [180, 180], armFar: [-5, -95], legNear: [72, 72], legFar: [70, 70] },
    { torso: -102, armNear: [178, 178], armFar: [-5, -95], legNear: [80, 80], legFar: [78, 78] },
  ]),
  "bicycle-crunch": motion("side", "hip", 0.45, [
    {
      torso: -112,
      head: 15,
      armNear: [-150, 40],
      armFar: [-145, 45],
      legNear: [140, 80],
      legFar: [100, 100],
    },
    {
      torso: -112,
      head: 15,
      armNear: [-150, 40],
      armFar: [-145, 45],
      legNear: [100, 100],
      legFar: [140, 80],
    },
  ]),
  "leg-raise": motion("side", "hip", 0.9, [
    { torso: -90, armNear: [90, 90], armFar: [92, 92], legNear: [96, 96], legFar: [97, 97] },
    { torso: -90, armNear: [90, 90], armFar: [92, 92], legNear: [178, 178], legFar: [176, 176] },
  ]),
  "hollow-hold": motion("side", "hip", 1.2, [
    {
      torso: -106,
      head: 10,
      armNear: [-108, -108],
      armFar: [-106, -106],
      legNear: [102, 102],
      legFar: [101, 101],
    },
    {
      torso: -104,
      head: 10,
      armNear: [-106, -106],
      armFar: [-104, -104],
      legNear: [100, 100],
      legFar: [99, 99],
    },
  ]),
  "mountain-climbers": motion("side", "handNear", 0.28, [
    pose(HIGH_PLANK, { legNear: [40, -40], legFar: [-78, -78] }),
    pose(HIGH_PLANK, { legFar: [40, -40], legNear: [-78, -78] }),
  ]),
  "plank-shoulder-taps": motion("side", "footNear", 0.55, [
    HIGH_PLANK,
    pose(HIGH_PLANK, { armNear: [30, 170] }),
    HIGH_PLANK,
    pose(HIGH_PLANK, { armFar: [30, 170] }),
  ]),

  // --- Lower body ---------------------------------------------------------------
  "glute-bridge": motion("side", "footNear", 0.8, [ON_BACK, BRIDGE]),
  "wall-glute-bridge": motion(
    "side",
    "footNear",
    0.85,
    [
      { torso: -90, armNear: [90, 90], armFar: [92, 92], legNear: [160, 92], legFar: [158, 92] },
      { torso: -70, armNear: [90, 90], armFar: [92, 92], legNear: [118, 70], legFar: [116, 70] },
    ],
    { kind: "wall", joint: "footNear", side: "front" },
  ),
  "single-leg-glute-bridge": motion("side", "footNear", 0.85, [
    pose(ON_BACK, { legFar: [140, 120] }),
    pose(BRIDGE, { legFar: [112, 112] }),
  ]),
  "side-leg-raise": motion("front", "hip", 0.8, [
    {
      torso: -90,
      head: 0,
      armNear: [92, 92],
      armFar: [-150, -40],
      legNear: [92, 92],
      legFar: [90, 90],
    },
    {
      torso: -90,
      head: 0,
      armNear: [92, 92],
      armFar: [-150, -40],
      legNear: [130, 130],
      legFar: [90, 90],
    },
  ]),
  "calf-raise": motion("side", "footNear", 0.6, [STAND, pose(STAND, { lift: 4 })]),
  squat: motion("side", "footNear", 0.8, [STAND, DEEP_SQUAT]),
  "wall-sit": motion(
    "side",
    "hip",
    1.2,
    [
      { torso: 180, armNear: [10, 10], armFar: [8, 8], legNear: [90, 0], legFar: [88, 2] },
      { torso: 180, armNear: [12, 12], armFar: [10, 10], legNear: [90, 0], legFar: [88, 2] },
    ],
    { kind: "wall", joint: "hip", side: "back" },
  ),
  "reverse-lunge": motion("side", "footNear", 0.8, [
    STAND,
    pose(STAND, { legNear: [82, 0], legFar: [-18, -86] }),
  ]),
  "split-squat": motion("side", "footNear", 0.8, [
    pose(STAND, { legNear: [22, 22], legFar: [-22, -22] }),
    pose(STAND, { legNear: [82, 0], legFar: [-18, -86] }),
  ]),
  "squat-jump": motion("side", "footNear", 0.45, [
    DEEP_SQUAT,
    pose(STAND, {
      armNear: [168, 172],
      armFar: [164, 170],
      legNear: [4, 8],
      legFar: [0, 6],
      lift: 11,
    }),
  ]),

  // --- Mobility and stretches ---------------------------------------------------
  "cat-cow": motion("side", "kneeNear", 1.2, [
    pose(ALL_FOURS, { torso: 96, head: 35 }),
    pose(ALL_FOURS, { torso: 84, head: -35 }),
  ]),
  "childs-pose": motion("side", "kneeNear", 1.6, [
    {
      torso: 62,
      head: 10,
      armNear: [84, 90],
      armFar: [86, 92],
      legNear: [80, -92],
      legFar: [82, -90],
    },
    {
      torso: 66,
      head: 10,
      armNear: [86, 92],
      armFar: [88, 94],
      legNear: [80, -92],
      legFar: [82, -90],
    },
  ]),
  "hamstring-stretch": motion("side", "footNear", 1.5, [
    STAND,
    pose(STAND, {
      torso: 100,
      armNear: [0, 0],
      armFar: [3, 3],
      legNear: [-6, -6],
      legFar: [-8, -8],
    }),
  ]),
  "quad-stretch": motion("side", "footFar", 1.4, [
    pose(STAND, { legNear: [-5, -168], armNear: [-35, -20], armFar: [75, 85] }),
    pose(STAND, { legNear: [-8, -170], armNear: [-38, -22], armFar: [75, 85] }),
  ]),
  "cobra-stretch": motion("side", "hip", 1.2, [
    { torso: 92, armNear: [-40, 80], armFar: [-38, 82], legNear: [-90, -90], legFar: [-91, -91] },
    {
      torso: 125,
      head: -20,
      armNear: [8, 8],
      armFar: [10, 10],
      legNear: [-92, -92],
      legFar: [-93, -93],
    },
  ]),
  "wall-hamstring-stretch": motion(
    "side",
    "hip",
    1.5,
    [
      {
        torso: -90,
        armNear: [-60, -60],
        armFar: [60, 60],
        legNear: [178, 178],
        legFar: [176, 176],
      },
      {
        torso: -90,
        armNear: [-62, -62],
        armFar: [62, 62],
        legNear: [174, 174],
        legFar: [172, 172],
      },
    ],
    { kind: "wall", joint: "footNear", side: "front" },
  ),
};
