import { CANVAS, SEGMENT, type Point, type Skeleton, type View } from "./skeleton";

/**
 * Turns a posed skeleton into the filled shapes of an athlete: tapered limbs
 * with rounded joints, a shaped torso, head with hair, clothing and shoes.
 * Pure geometry (no React), so it is unit-tested and the renderer stays thin.
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
} as const;

/** Limb thickness (radius at the start and end of each segment), in canvas units. */
const WIDTH = {
  upperArm: [2.35, 1.85],
  forearm: [1.8, 1.35],
  hand: 1.65,
  thigh: [3.3, 2.35],
  shin: [2.25, 1.45],
  neck: 1.5,
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
  return [
    capsule(shoulder, elbow, u1, u2, skin),
    capsule(elbow, hand, f1, f2, skin),
    disc(hand, WIDTH.hand, skin),
    // Short sleeve over the top of the upper arm.
    capsule(shoulder, lerp(shoulder, elbow, 0.42), u1 + 0.45, u1 + 0.25, top),
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

  // Side view: the trainer points forward from the ankle, square to the shin.
  // Front view: we see the toe cap, so it sits just under and outside the ankle.
  const shin = unit(sub(foot, knee));
  const toe =
    view === "side"
      ? aboveFloor(add(foot, forwardOf(shin), 3.6))
      : aboveFloor({ x: foot.x + (side === "near" ? 1.4 : -1.4), y: foot.y + 0.6 });
  const heel = view === "side" ? aboveFloor(add(foot, forwardOf(shin), -1)) : foot;

  return [
    capsule(hip, knee, t1, t2, skin),
    capsule(knee, foot, s1, s2, skin),
    // Shorts reach about 40% down the thigh.
    capsule(hip, lerp(hip, knee, 0.42), t1 + 0.35, t1 + 0.1, shorts),
    capsule(heel, toe, 1.75, 1.35, shoe),
    // Sole line along the bottom of the trainer, resting on (not under) the floor.
    capsule(sole(heel), sole(toe), 0.7, 0.6, PALETTE.sole),
  ];
}

function torso(s: Skeleton, view: View): Shape[] {
  const spine = unit(sub(s.neck, s.hip));
  const chest = lerp(s.hip, s.neck, 0.72);
  const front = view === "front";
  // From the front the chest is broad; from the side it has depth, a bit less.
  const waist = front ? 4.3 : 3.6;
  const chestR = front ? 5.6 : 4.5;
  const pelvisR = front ? 4.6 : 3.8;
  const neckBase = add(s.neck, spine, -0.6);
  const shapes: Shape[] = [
    capsule(s.neck, add(s.head, spine, -WIDTH.head * 0.6), WIDTH.neck, WIDTH.neck, PALETTE.skin),
    capsule(s.hip, chest, waist, chestR, PALETTE.top),
    capsule(chest, neckBase, chestR, front ? 4.4 : 3.4, PALETTE.top),
    disc(s.hip, pelvisR, PALETTE.shorts),
  ];
  if (front) {
    // Shoulders and hips are spread apart from the front: round them off.
    shapes.push(capsule(s.shoulderFar, s.shoulderNear, 2.4, 2.4, PALETTE.top));
    shapes.push(capsule(s.hipFar, s.hipNear, 3.4, 3.4, PALETTE.shorts));
  }
  return shapes;
}

function head(s: Skeleton, view: View): Shape[] {
  const up = unit(sub(s.head, s.neck));
  const r = WIDTH.head;
  if (view === "front") {
    return [
      disc(add(s.head, up, 1.5), r * 1.02, PALETTE.hair),
      disc(add(s.head, up, -0.45), r * 0.86, PALETTE.skin),
      disc(add({ x: s.head.x - 1.5, y: s.head.y }, up, -0.2), 0.42, PALETTE.hair),
      disc(add({ x: s.head.x + 1.5, y: s.head.y }, up, -0.2), 0.42, PALETTE.hair),
    ];
  }
  const forward = forwardOf({ x: -up.x, y: -up.y });
  return [
    // Hair sits towards the back and top; the face shows at the front.
    disc(add(add(s.head, forward, -1.6), up, 1.1), r * 1.0, PALETTE.hair),
    disc(add(add(s.head, forward, 0.75), up, -0.35), r * 0.84, PALETTE.skin),
    // Nose tip, so it's always clear which way the athlete faces.
    disc(add(add(s.head, forward, 0.75 + r * 0.84), up, -0.5), 0.8, PALETTE.skin),
    // Eye, towards the front of the face.
    disc(add(add(s.head, forward, 0.75 + r * 0.45), up, 0.3), 0.42, PALETTE.hair),
  ];
}

/**
 * Shapes in paint order: far limbs first (shaded, as they're further from
 * the light), then the body, then near limbs on top. From the front both
 * sides are equally lit.
 */
export function bodyShapes(s: Skeleton, view: View): Shape[] {
  const shadeFar = view === "side";
  return [
    ...arm(s, "far", shadeFar),
    ...leg(s, "far", view, shadeFar),
    ...torso(s, view),
    ...head(s, view),
    ...leg(s, "near", view, false),
    ...arm(s, "near", false),
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
