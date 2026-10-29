import { CANVAS, SEGMENT, type Point, type Skeleton, type View } from "./skeleton";

/**
 * Turns a posed skeleton into the filled shapes of an athlete: muscled,
 * tapered limbs with rounded joints, a shaped torso, head with hair, face and
 * ears, hands, clothing and shoes, all with a dark outline. Pure geometry (no
 * React), so it is unit-tested and the renderer stays thin.
 *
 * Every body part is a "capsule": a tapered bar between two points with a
 * round cap at each end (radius r1 at `a`, r2 at `b`). Overlapping capsules
 * of the same colour read as one smooth limb.
 */
export interface Capsule {
  kind: "capsule";
  a: Point;
  b: Point;
  r1: number;
  r2: number;
  fill: string;
}

export interface Disc {
  kind: "disc";
  c: Point;
  r: number;
  fill: string;
}

export type Shape = Capsule | Disc;

/** Original palette: medium-brown skin, lime top (the brand colour), navy shorts, white trainers. */
export const PALETTE = {
  skin: "#B97A4E",
  skinShade: "#8C5A37",
  hair: "#1B1714",
  top: "#C6F432",
  topShade: "#8DB01F",
  shorts: "#2B3550",
  shortsShade: "#1E263B",
  shoe: "#EEF1F5",
  shoeShade: "#AEB6C4",
  sole: "#5A6375",
  outline: "#0B0E14",
} as const;

/** How far the outline shows around the figure and around near limbs, in canvas units. */
const OUTLINE = 0.5;

/** Limb thickness (radius at the start and end of each segment), in canvas units. */
const WIDTH = {
  upperArm: [2.45, 1.75],
  forearm: [1.95, 1.3],
  hand: 1.35,
  thigh: [3.4, 2.25],
  shin: [2.15, 1.35],
  neck: 1.9,
  head: SEGMENT.headRadius,
} as const;

const add = (p: Point, v: Point, k = 1): Point => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const unit = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: 1 } : { x: v.x / len, y: v.y / len };
};
/** Rotates a direction a quarter turn towards where the figure faces (screen right). */
const forwardOf = (d: Point): Point => ({ x: d.y, y: -d.x });

const capsule = (a: Point, b: Point, r1: number, r2: number, fill: string): Capsule => ({
  kind: "capsule",
  a,
  b,
  r1,
  r2,
  fill,
});
const disc = (c: Point, r: number, fill: string): Disc => ({ kind: "disc", c, r, fill });

/** The same shapes grown by `by` and filled dark: drawn first, it outlines them. */
const outlineOf = (shapes: Shape[], by = OUTLINE): Shape[] =>
  shapes.map((s) =>
    s.kind === "disc"
      ? disc(s.c, s.r + by, PALETTE.outline)
      : capsule(s.a, s.b, s.r1 + by, s.r2 + by, PALETTE.outline),
  );

/** Keeps a point from sinking below the floor line (e.g. toes in a plank). */
const aboveFloor = (p: Point): Point => ({ x: p.x, y: Math.min(p.y, CANVAS.floor) });

/** Sole sits just under a shoe point, but never below the floor surface. */
const sole = (p: Point): Point => ({ x: p.x, y: Math.min(p.y + 0.9, CANVAS.floor - 0.6) });

type Side = "near" | "far";

function arm(s: Skeleton, side: Side, shade: boolean): Shape[] {
  const shoulder = side === "near" ? s.shoulderNear : s.shoulderFar;
  const elbow = side === "near" ? s.elbowNear : s.elbowFar;
  const hand = side === "near" ? s.handNear : s.handFar;
  const skin = shade ? PALETTE.skinShade : PALETTE.skin;
  const top = shade ? PALETTE.topShade : PALETTE.top;
  const [u1, u2] = WIDTH.upperArm;
  const [f1, f2] = WIDTH.forearm;
  const along = unit(sub(hand, elbow));
  return [
    capsule(shoulder, elbow, u1, u2, skin),
    // Biceps and the forearm muscle just below the elbow.
    capsule(lerp(shoulder, elbow, 0.3), lerp(shoulder, elbow, 0.75), u1 + 0.15, u2 + 0.3, skin),
    capsule(elbow, hand, f1, f2, skin),
    capsule(elbow, lerp(elbow, hand, 0.45), f1 + 0.1, f1 - 0.15, skin),
    // Hand: a palm carrying on from the wrist, fingers together.
    capsule(hand, add(hand, along, 2.1), WIDTH.hand, 1.1, skin),
    // Short sleeve over the shoulder and the top of the upper arm.
    capsule(shoulder, lerp(shoulder, elbow, 0.42), u1 + 0.55, u1 + 0.25, top),
  ];
}

function leg(s: Skeleton, side: Side, view: View, shade: boolean): Shape[] {
  const hip = side === "near" ? s.hipNear : s.hipFar;
  const knee = side === "near" ? s.kneeNear : s.kneeFar;
  const foot = side === "near" ? s.footNear : s.footFar;
  const skin = shade ? PALETTE.skinShade : PALETTE.skin;
  const shorts = shade ? PALETTE.shortsShade : PALETTE.shorts;
  const shoe = shade ? PALETTE.shoeShade : PALETTE.shoe;
  const [t1, t2] = WIDTH.thigh;
  const [s1, s2] = WIDTH.shin;

  const thighDir = unit(sub(knee, hip));
  const shin = unit(sub(foot, knee));
  const front = view === "side" ? forwardOf(thighDir) : { x: 0, y: 0 };
  const calfSide = view === "side" ? forwardOf(shin) : { x: 0, y: 0 };

  // Side view: the trainer points forward from the ankle, square to the shin.
  // A standing foot lifted off the floor (calf raise, jump) points its toes
  // down, so heels rise and toes stay on, or reach for, the floor.
  // Front view: we see the toe cap, so it sits just under and outside the ankle.
  let toe: Point;
  let heel: Point;
  if (view === "side") {
    const ahead = forwardOf(shin);
    const gap = CANVAS.floor - foot.y;
    const standing = shin.y > 0.6;
    const tilt = standing && gap > 0.3 ? Math.min(1.2, Math.asin(Math.min(1, gap / 3.6))) : 0;
    const toeDir = unit(
      add({ x: ahead.x * Math.cos(tilt), y: ahead.y * Math.cos(tilt) }, shin, Math.sin(tilt)),
    );
    toe = aboveFloor(add(foot, toeDir, 3.6));
    heel = aboveFloor(add(foot, toeDir, -1));
  } else {
    toe = aboveFloor({ x: foot.x + (side === "near" ? 1.4 : -1.4), y: foot.y + 0.6 });
    heel = foot;
  }

  return [
    capsule(hip, knee, t1, t2, skin),
    // Quads bulge at the front of the thigh, the calf at the back of the shin.
    capsule(
      add(lerp(hip, knee, 0.35), front, 0.5),
      add(lerp(hip, knee, 0.8), front, 0.45),
      t1 - 0.2,
      t2 + 0.15,
      skin,
    ),
    capsule(knee, foot, s1, s2, skin),
    capsule(
      add(lerp(knee, foot, 0.18), calfSide, -0.75),
      add(lerp(knee, foot, 0.55), calfSide, -0.35),
      s1 + 0.25,
      s2 + 0.35,
      skin,
    ),
    // Knee cap.
    disc(add(knee, front, 0.35), s1 + 0.2, skin),
    // Shorts reach about 40% down the thigh.
    capsule(hip, lerp(hip, knee, 0.42), t1 + 0.45, t1 + 0.15, shorts),
    capsule(heel, toe, 1.75, 1.35, shoe),
    // Sole line along the bottom of the trainer, resting on (not under) the floor.
    capsule(sole(heel), sole(toe), 0.7, 0.6, PALETTE.sole),
  ];
}

function torso(s: Skeleton, view: View): Shape[] {
  const spineUp = unit(sub(s.neck, s.hip));
  const front = view === "front";
  // From the front the chest is broad and tapers to the waist; from the side
  // it has depth, a bit less, and follows the curve of the spine.
  const waist = front ? 4.0 : 3.5;
  const chestR = front ? 5.7 : 4.6;
  const pelvisR = front ? 4.6 : 3.8;
  const chest = lerp(s.spine, s.neck, 0.45);
  const neckBase = add(s.neck, spineUp, -0.6);
  const shapes: Shape[] = [
    capsule(s.neck, add(s.head, spineUp, -WIDTH.head * 0.6), WIDTH.neck, WIDTH.neck, PALETTE.skin),
    capsule(s.hip, s.spine, waist, waist + 0.4, PALETTE.top),
    capsule(s.spine, chest, waist + 0.4, chestR, PALETTE.top),
    capsule(chest, neckBase, chestR, front ? 4.6 : 3.4, PALETTE.top),
    disc(s.hip, pelvisR, PALETTE.shorts),
  ];
  if (front) {
    // Shoulders and hips are spread apart from the front: round them off,
    // with a deltoid cap (under the sleeve) at each shoulder.
    shapes.push(capsule(s.shoulderFar, s.shoulderNear, 2.6, 2.6, PALETTE.top));
    shapes.push(disc(s.shoulderNear, 2.9, PALETTE.top), disc(s.shoulderFar, 2.9, PALETTE.top));
    shapes.push(capsule(s.hipFar, s.hipNear, 3.4, 3.4, PALETTE.shorts));
  } else {
    // Glutes at the back of the hips.
    shapes.push(disc(add(s.hip, forwardOf(spineUp), 1.3), 3.5, PALETTE.shorts));
  }
  return shapes;
}

function head(s: Skeleton, view: View): Shape[] {
  const up = unit(sub(s.head, s.neck));
  const r = WIDTH.head;
  if (view === "front") {
    const side = { x: -up.y, y: up.x };
    return [
      // Ears, then the face over them, then hair on top.
      disc(add(s.head, side, r * 0.86), 1.1, PALETTE.skinShade),
      disc(add(s.head, side, -r * 0.86), 1.1, PALETTE.skinShade),
      disc(add(s.head, up, 1.5), r * 1.02, PALETTE.hair),
      disc(add(s.head, up, -0.45), r * 0.86, PALETTE.skin),
      // Jaw, a little narrower than the cheeks.
      capsule(add(s.head, up, -1), add(s.head, up, -2.6), r * 0.72, r * 0.48, PALETTE.skin),
      disc(add(add(s.head, side, -1.5), up, -0.2), 0.42, PALETTE.hair),
      disc(add(add(s.head, side, 1.5), up, -0.2), 0.42, PALETTE.hair),
      // Brows and mouth.
      capsule(
        add(add(s.head, side, -2.1), up, 0.75),
        add(add(s.head, side, -0.9), up, 0.85),
        0.22,
        0.22,
        PALETTE.hair,
      ),
      capsule(
        add(add(s.head, side, 0.9), up, 0.85),
        add(add(s.head, side, 2.1), up, 0.75),
        0.22,
        0.22,
        PALETTE.hair,
      ),
      capsule(
        add(add(s.head, side, -0.8), up, -2.2),
        add(add(s.head, side, 0.8), up, -2.2),
        0.22,
        0.22,
        PALETTE.skinShade,
      ),
    ];
  }
  const forward = forwardOf({ x: -up.x, y: -up.y });
  const face = add(add(s.head, forward, 0.75), up, -0.35);
  return [
    // Hair sits towards the back and top; the face shows at the front.
    disc(add(add(s.head, forward, -1.6), up, 1.1), r * 1.0, PALETTE.hair),
    disc(face, r * 0.84, PALETTE.skin),
    // Jaw and chin, sloping down to the front.
    capsule(
      add(face, up, -0.5),
      add(add(face, forward, 1.6), up, -2.6),
      r * 0.7,
      1.5,
      PALETTE.skin,
    ),
    // Ear at the side of the head.
    disc(add(add(s.head, forward, -1.3), up, -0.4), 1.0, PALETTE.skinShade),
    // Nose tip, so it's always clear which way the athlete faces.
    disc(add(add(s.head, forward, 0.75 + r * 0.84), up, -0.5), 0.85, PALETTE.skin),
    // Eye and brow, towards the front of the face.
    disc(add(add(s.head, forward, 0.75 + r * 0.45), up, 0.3), 0.42, PALETTE.hair),
    capsule(
      add(add(s.head, forward, 0.75 + r * 0.2), up, 1.25),
      add(add(s.head, forward, 0.75 + r * 0.7), up, 1.1),
      0.24,
      0.24,
      PALETTE.hair,
    ),
  ];
}

/**
 * Shapes in paint order: an outline around the whole figure, far limbs
 * (shaded, as they're further from the light), then the body, then near
 * limbs on top with their own outline so they stand out against the body.
 * From the front both sides are equally lit.
 */
export function bodyShapes(s: Skeleton, view: View): Shape[] {
  const shadeFar = view === "side";
  const far = [...arm(s, "far", shadeFar), ...leg(s, "far", view, shadeFar)];
  const middle = [...torso(s, view), ...head(s, view)];
  const nearLeg = leg(s, "near", view, false);
  const nearArm = arm(s, "near", false);
  const all = [...far, ...middle, ...nearLeg, ...nearArm];
  return [
    ...outlineOf(all),
    ...far,
    ...middle,
    ...outlineOf(nearLeg, 0.35),
    ...nearLeg,
    ...outlineOf(nearArm, 0.35),
    ...nearArm,
  ];
}

/** A soft contact shadow under the figure, spanning what touches or nears the floor. */
export function floorShadow(s: Skeleton): { cx: number; rx: number } {
  const low = Object.values(s).filter((p) => p.y > CANVAS.floor - 12);
  const xs = (low.length ? low : Object.values(s)).map((p) => p.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return { cx: (min + max) / 2, rx: Math.max(7, (max - min) / 2 + 5) };
}

/**
 * SVG path for a capsule: the two tangent lines between the end circles plus
 * the outer arcs. When one circle swallows the other, it's just that circle.
 */
export function capsulePath({ a, b, r1, r2 }: Capsule): string {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d <= Math.abs(r1 - r2) + 1e-6) {
    const [c, r] = r1 >= r2 ? [a, r1] : [b, r2];
    return circlePath(c, r);
  }
  // Angle of the tangent points measured from the a→b axis.
  const axis = Math.atan2(b.y - a.y, b.x - a.x);
  const theta = Math.acos((r1 - r2) / d);
  const at = (c: Point, r: number, angle: number) =>
    `${(c.x + r * Math.cos(angle)).toFixed(2)} ${(c.y + r * Math.sin(angle)).toFixed(2)}`;
  const a1 = at(a, r1, axis + theta);
  const b1 = at(b, r2, axis + theta);
  const b2 = at(b, r2, axis - theta);
  const a2 = at(a, r1, axis - theta);
  // Around b the cap spans 2θ (the far side); around a it spans 2π - 2θ.
  const bigB = 2 * theta > Math.PI ? 1 : 0;
  const bigA = 2 * Math.PI - 2 * theta > Math.PI ? 1 : 0;
  return `M ${a1} L ${b1} A ${r2} ${r2} 0 ${bigB} 0 ${b2} L ${a2} A ${r1} ${r1} 0 ${bigA} 0 ${a1} Z`;
}

function circlePath(c: Point, r: number): string {
  return `M ${(c.x - r).toFixed(2)} ${c.y.toFixed(2)} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}
