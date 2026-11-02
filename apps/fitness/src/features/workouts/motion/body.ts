import { backOf, CANVAS, spineControl, type Point, type Skeleton, type View } from "./skeleton";

/**
 * Turns a posed skeleton into the filled shapes of an athlete: muscled limbs
 * with a calf, biceps and deltoid, a torso that follows the spine's curve,
 * hands, trainers, a face and clothing. Pure geometry (no React), so it is
 * unit-tested and the renderer only has to draw SVG paths.
 *
 * Limbs and torso are "profiles": a centre line plus a table of widths along
 * it, one width for each side, joined into a smooth outline. Overlapping
 * shapes of the same colour read as one body.
 */
export interface Shape {
  /** SVG path data, in canvas units. */
  d: string;
  fill: string;
  opacity?: number;
}

/** Original palette: medium-brown skin, lime top (the brand colour), navy shorts, white trainers. */
export const PALETTE = {
  skin: "#B97A4E",
  skinShade: "#8C5A37",
  skinDeep: "#6E4429",
  hair: "#1B1714",
  lip: "#7A4630",
  top: "#C6F432",
  topShade: "#8DB01F",
  shorts: "#2B3550",
  shortsShade: "#1E263B",
  shoe: "#EEF1F5",
  shoeShade: "#AEB6C4",
  sole: "#5A6375",
} as const;

/** One row of a profile: [position along the line 0..1, width on the n side, width on the other]. */
type Row = readonly [t: number, n: number, other: number];
/** A centre line: the point at `t` and the unit direction of travel there. */
type Line = (t: number) => { p: Point; dir: Point };

// Side-view widths. For limbs the n side is the front (quads, shins,
// biceps); the calf, hamstring and triceps bulge out the other side.
const SIDE = {
  thigh: [
    [0, 3.3, 3.4],
    [0.3, 3.2, 3.0],
    [0.7, 2.6, 2.3],
    [1, 2.1, 2.0],
  ],
  shin: [
    [0, 2.0, 2.05],
    [0.25, 1.8, 2.55],
    [0.55, 1.5, 2.0],
    [0.85, 1.15, 1.3],
    [1, 1.15, 1.2],
  ],
  upperArm: [
    [0, 2.5, 2.6],
    [0.22, 2.45, 2.4],
    [0.55, 2.05, 2.15],
    [1, 1.6, 1.6],
  ],
  forearm: [
    [0, 1.6, 1.6],
    [0.25, 1.85, 1.75],
    [0.7, 1.35, 1.3],
    [1, 1.05, 1.0],
  ],
  // For the torso the n side is the back: glutes low, shoulder blades high;
  // the chest is the fullest part of the front.
  torso: [
    [0, 3.6, 3.2],
    [0.15, 3.6, 3.1],
    [0.35, 3.1, 3.1],
    [0.6, 3.3, 3.8],
    [0.78, 3.5, 4.3],
    [0.92, 3.2, 3.5],
    [1, 2.4, 2.3],
  ],
} satisfies Record<string, Row[]>;

/** From the front each limb is symmetric, as wide as its fuller side. */
const symmetric = (rows: readonly Row[]): Row[] =>
  rows.map(([t, a, b]) => [t, Math.max(a, b), Math.max(a, b)] as const);

const FRONT = {
  thigh: [
    [0, 3.2, 3.2],
    [0.3, 3.0, 3.0],
    [0.7, 2.4, 2.4],
    [1, 1.95, 1.95],
  ],
  shin: symmetric(SIDE.shin),
  upperArm: symmetric(SIDE.upperArm),
  forearm: symmetric(SIDE.forearm),
  // Hips, a narrower waist, then lats and shoulders sloping into the neck.
  torso: (
    [
      [0, 5.6],
      [0.15, 5.3],
      [0.35, 4.5],
      [0.6, 5.0],
      [0.8, 5.8],
      [0.93, 6.4],
      [1, 3.2],
    ] as const
  ).map(([t, w]) => [t, w, w] as const),
} satisfies Record<keyof typeof SIDE, readonly Row[]>;

// --- Geometry helpers --------------------------------------------------------

const add = (p: Point, v: Point, k = 1): Point => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const unit = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: 1 } : { x: v.x / len, y: v.y / len };
};
const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
/** Point a quarter turn towards the facing direction (screen right when upright). */
const forwardOf = (up: Point): Point => ({ x: -up.y, y: up.x });

const fmt = (p: Point) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

/**
 * A smooth closed outline through `points` (Catmull-Rom spline as cubic
 * Béziers), so a profile's corners become muscle-like curves.
 */
export function smoothPath(points: readonly Point[]): string {
  const n = points.length;
  const first = points[0];
  if (!first) return "";
  const get = (i: number): Point => points[((i % n) + n) % n] ?? first;
  let d = `M ${fmt(first)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [get(i - 1), get(i), get(i + 1), get(i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return `${d} Z`;
}

export function circlePath(c: Point, r: number): string {
  return `M ${(c.x - r).toFixed(2)} ${c.y.toFixed(2)} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

/**
 * SVG path for a capsule: a tapered bar from `a` (radius r1) to `b` (radius
 * r2) with round ends: the two tangent lines between the end circles plus the
 * outer arcs. When one circle swallows the other, it's just that circle.
 */
export function capsulePath(a: Point, b: Point, r1: number, r2: number): string {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d <= Math.abs(r1 - r2) + 1e-6) return r1 >= r2 ? circlePath(a, r1) : circlePath(b, r2);
  const axis = Math.atan2(b.y - a.y, b.x - a.x);
  const theta = Math.acos((r1 - r2) / d);
  const at = (c: Point, r: number, angle: number) =>
    `${(c.x + r * Math.cos(angle)).toFixed(2)} ${(c.y + r * Math.sin(angle)).toFixed(2)}`;
  // Around b the cap spans 2θ (the far side); around a it spans 2π - 2θ.
  const bigB = 2 * theta > Math.PI ? 1 : 0;
  const bigA = 2 * Math.PI - 2 * theta > Math.PI ? 1 : 0;
  return `M ${at(a, r1, axis + theta)} L ${at(b, r2, axis + theta)} A ${r2} ${r2} 0 ${bigB} 0 ${at(b, r2, axis - theta)} L ${at(a, r1, axis - theta)} A ${r1} ${r1} 0 ${bigA} 0 ${at(a, r1, axis + theta)} Z`;
}

const straight =
  (a: Point, b: Point): Line =>
  (t) => ({ p: lerp(a, b, t), dir: unit(sub(b, a)) });

/** The spine: a quadratic curve from hip to neck bowing through `mid`. */
function curve(hip: Point, mid: Point, neck: Point): Line {
  const c = spineControl(hip, mid, neck);
  return (t) => {
    const u = 1 - t;
    const p = {
      x: u * u * hip.x + 2 * u * t * c.x + t * t * neck.x,
      y: u * u * hip.y + 2 * u * t * c.y + t * t * neck.y,
    };
    const dir = unit({
      x: 2 * u * (c.x - hip.x) + 2 * t * (neck.x - c.x),
      y: 2 * u * (c.y - hip.y) + 2 * t * (neck.y - c.y),
    });
    return { p, dir };
  };
}

/** Rows cut down to the stretch from `from` to `to`, re-based to 0..1 and widened by `grow`. */
function slice(rows: readonly Row[], from: number, to: number, grow = 0): Row[] {
  const widthAt = (t: number): [number, number] => {
    const next = rows.findIndex(([rt]) => rt >= t);
    const b = rows[Math.max(0, next)] ?? rows[rows.length - 1];
    const a = rows[Math.max(0, next - 1)] ?? b;
    if (!a || !b) return [0, 0];
    const k = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  };
  const inside = rows.filter(([t]) => t > from && t < to).map(([t]) => t);
  return [from, ...inside, to].map((t) => {
    const [n, o] = widthAt(t);
    return [(t - from) / (to - from), n + grow, o + grow] as const;
  });
}

/**
 * Outline of a profile along `line` between `from` and `to` (fractions of the
 * line): down one side, round the end, back up the other side. Clothing
 * edges (`rounded: false`) are cut square instead of capped.
 */
function profile(line: Line, rows: readonly Row[], from = 0, to = 1, rounded = true): string {
  const span = (t: number) => from + (to - from) * t;
  const n = (dir: Point) => backOf(dir);
  const sideA = rows.map(([t, w]) => {
    const { p, dir } = line(span(t));
    return add(p, n(dir), w);
  });
  const sideB = rows.map(([t, , w]) => {
    const { p, dir } = line(span(t));
    return add(p, n(dir), -w);
  });
  const end = (t: number, out: 1 | -1, row?: Row) => {
    const { p, dir } = line(span(t));
    const r = row ? (row[1] + row[2]) / 2 : 1;
    return add(p, dir, out * r * 0.8);
  };
  const last = rows[rows.length - 1];
  if (!rounded) return smoothPath([...sideA, ...sideB.reverse()]);
  return smoothPath([...sideA, end(1, 1, last), ...sideB.reverse(), end(0, -1, rows[0])]);
}

/** Clothing over the first `to` of a limb: rounded where it joins the body, cut square at the hem. */
function sleeve(line: Line, rows: readonly Row[], to: number): string {
  const sideA = rows.map(([t, w]) => {
    const { p, dir } = line(t * to);
    return add(p, backOf(dir), w);
  });
  const sideB = rows.map(([t, , w]) => {
    const { p, dir } = line(t * to);
    return add(p, backOf(dir), -w);
  });
  const { p, dir } = line(0);
  const first = rows[0];
  const cap = first ? (first[1] + first[2]) / 2 : 1;
  return smoothPath([add(p, dir, -cap * 0.8), ...sideA, ...[...sideB].reverse()]);
}

/** Shorts on the torso: the hip end is rounded (the seat), the waist end straight. */
const waist = sleeve;

/**
 * A darker band along one side of a profile (the side away from the light),
 * which gives limbs and torso a rounded, three-dimensional look.
 */
function shadeBand(line: Line, rows: readonly Row[], side: "n" | "other", depth = 0.45): string {
  const band = rows.map(([t, a, b]): Row => {
    const w = side === "n" ? a : b;
    return side === "n" ? [t, w, -w * depth] : [t, -w * depth, w];
  });
  return profile(line, band);
}

const shape = (d: string, fill: string, opacity?: number): Shape =>
  opacity === undefined ? { d, fill } : { d, fill, opacity };
const disc = (c: Point, r: number, fill: string) => shape(circlePath(c, r), fill);
const capsule = (a: Point, b: Point, r1: number, r2: number, fill: string) =>
  shape(capsulePath(a, b, r1, r2), fill);

/** Keeps a point from sinking below the floor line. */
const aboveFloor = (p: Point, r: number): Point => ({ x: p.x, y: Math.min(p.y, CANVAS.floor - r) });

// --- Body parts ----------------------------------------------------------------

type Side = "near" | "far";

function arm(s: Skeleton, side: Side, view: View, shade: boolean): Shape[] {
  const shoulder = side === "near" ? s.shoulderNear : s.shoulderFar;
  const elbow = side === "near" ? s.elbowNear : s.elbowFar;
  const wrist = side === "near" ? s.handNear : s.handFar;
  const fingers = side === "near" ? s.fingersNear : s.fingersFar;
  const rows = view === "side" ? SIDE : FRONT;
  const skin = shade ? PALETTE.skinShade : PALETTE.skin;
  const top = shade ? PALETTE.topShade : PALETTE.top;
  const upper = straight(shoulder, elbow);
  const lower = straight(elbow, wrist);
  const palm = unit(sub(fingers, wrist));
  const thumbSide = backOf(palm);
  const shapes = [
    shape(profile(upper, rows.upperArm), skin),
    shape(profile(lower, rows.forearm), skin),
    disc(elbow, 1.6, skin),
    // Hand: palm and fingers in one rounded wedge, plus the thumb.
    capsule(
      aboveFloor(add(wrist, palm, 0.5), 1.15),
      aboveFloor(add(fingers, palm, -0.9), 0.85),
      1.2,
      0.9,
      skin,
    ),
    capsule(add(wrist, palm, 1), add(add(wrist, palm, 2.4), thumbSide, 1.1), 0.6, 0.5, skin),
    // Short sleeve over the top of the upper arm.
    shape(sleeve(upper, slice(rows.upperArm, 0, 0.38, 0.25), 0.38), top),
  ];
  if (!shade) {
    shapes.splice(2, 0, shape(shadeBand(upper, rows.upperArm, "other"), PALETTE.skinShade, 0.5));
    shapes.splice(3, 0, shape(shadeBand(lower, rows.forearm, "other"), PALETTE.skinShade, 0.5));
  }
  return shapes;
}

function shoe(s: Skeleton, side: Side, view: View, shade: boolean): Shape[] {
  const ankle = side === "near" ? s.footNear : s.footFar;
  const knee = side === "near" ? s.kneeNear : s.kneeFar;
  const heel = side === "near" ? s.heelNear : s.heelFar;
  const toe = side === "near" ? s.toeNear : s.toeFar;
  const upper = shade ? PALETTE.shoeShade : PALETTE.shoe;
  const down = unit(sub(ankle, knee)); // towards the sole
  if (view === "front") {
    // Toe cap seen head-on, sitting on the sole point.
    const across = { x: -down.y, y: down.x };
    const c = add(heel, down, -1.2);
    return [
      capsule(add(c, across, -0.9), add(c, across, 0.9), 1.2, 1.2, upper),
      capsule(add(heel, across, -1.2), add(heel, across, 1.2), 0.45, 0.45, PALETTE.sole),
    ];
  }
  const f = unit(sub(toe, heel)); // along the foot
  const sole = { x: -f.y, y: f.x }; // square to the foot, towards the sole
  const outline = [
    add(add(ankle, f, -1.4), sole, -0.9), // collar, back
    add(add(ankle, f, -2.1), sole, 0.6), // heel counter
    heel,
    toe,
    add(add(ankle, f, 5.6), sole, 1.0), // toe tip
    add(add(ankle, f, 4.4), sole, -0.1), // toe box
    add(add(ankle, f, 1.8), sole, -0.9), // instep and laces
    add(add(ankle, f, 0.8), sole, -1.5), // collar, front
  ];
  const lift = { x: -sole.x, y: -sole.y };
  return [
    shape(smoothPath(outline), upper),
    capsule(add(heel, lift, 0.45), add(toe, lift, 0.45), 0.45, 0.42, PALETTE.sole),
    // Laces: a soft stripe over the instep.
    capsule(
      add(add(ankle, f, 0.9), sole, -1.0),
      add(add(ankle, f, 3.0), sole, -0.45),
      0.3,
      0.3,
      PALETTE.shoeShade,
    ),
  ];
}

function leg(s: Skeleton, side: Side, view: View, shade: boolean): Shape[] {
  const hip = side === "near" ? s.hipNear : s.hipFar;
  const knee = side === "near" ? s.kneeNear : s.kneeFar;
  const ankle = side === "near" ? s.footNear : s.footFar;
  const rows = view === "side" ? SIDE : FRONT;
  const skin = shade ? PALETTE.skinShade : PALETTE.skin;
  const shorts = shade ? PALETTE.shortsShade : PALETTE.shorts;
  const thigh = straight(hip, knee);
  const shin = straight(knee, ankle);
  const shapes = [
    shape(profile(thigh, rows.thigh), skin),
    shape(profile(shin, rows.shin), skin),
    disc(knee, 2.05, skin),
    ...shoe(s, side, view, shade),
    // Shorts reach about 40% down the thigh.
    shape(sleeve(thigh, slice(rows.thigh, 0, 0.4, 0.2), 0.4), shorts),
  ];
  if (!shade) {
    shapes.splice(2, 0, shape(shadeBand(shin, rows.shin, "other"), PALETTE.skinShade, 0.5));
    shapes.splice(3, 0, shape(shadeBand(thigh, rows.thigh, "other"), PALETTE.skinShade, 0.45));
  }
  return shapes;
}

function torso(s: Skeleton, view: View): Shape[] {
  const rows = view === "side" ? SIDE.torso : FRONT.torso;
  const spine = curve(s.hip, s.spine, s.neck);
  const up = unit(sub(s.head, s.neck));
  const neckRadius = view === "side" ? 2.1 : 2.3;
  return [
    // Neck first so the shirt's collar overlaps it.
    capsule(
      add(s.neck, up, -0.5),
      add(s.head, up, -2.4),
      neckRadius,
      neckRadius - 0.2,
      PALETTE.skin,
    ),
    shape(profile(spine, rows), PALETTE.top),
    shape(shadeBand(spine, rows, "n", 0.4), PALETTE.topShade, view === "side" ? 0.6 : 0.35),
    // Shorts: rounded under the seat, cut straight at the waistband.
    shape(waist(spine, slice(rows, 0, 0.32, 0.2), 0.32), PALETTE.shorts),
  ];
}

function head(s: Skeleton, view: View): Shape[] {
  const up = unit(sub(s.head, s.neck));
  const fwd = forwardOf(up);
  const at = (f: number, u: number) => add(add(s.head, fwd, f), up, u);
  const r = 5;
  if (view === "front") {
    // From the front `fwd` runs across the face, to the athlete's left.
    return [
      disc(at(0, 1.1), r * 1.0, PALETTE.hair),
      disc(at(-4.4, -0.4), 1.05, PALETTE.skin),
      disc(at(4.4, -0.4), 1.05, PALETTE.skin),
      disc(at(0, -0.3), r * 0.86, PALETTE.skin),
      capsule(at(0, -0.5), at(0, -2.8), 3.9, 2.3, PALETTE.skin),
      capsule(at(-2.6, 2.8), at(2.6, 2.8), 1.5, 1.5, PALETTE.hair),
      capsule(at(-2.4, 1.0), at(-1.0, 1.1), 0.33, 0.33, PALETTE.hair),
      capsule(at(1.0, 1.1), at(2.4, 1.0), 0.33, 0.33, PALETTE.hair),
      disc(at(-1.6, 0.1), 0.45, PALETTE.hair),
      disc(at(1.6, 0.1), 0.45, PALETTE.hair),
      shape(circlePath(at(0, -1.4), 0.65), PALETTE.skinShade, 0.7),
      capsule(at(-0.9, -2.9), at(0.9, -2.9), 0.3, 0.3, PALETTE.lip),
    ];
  }
  return [
    // Hair sits towards the back and top; the face shows at the front.
    disc(at(-0.9, 0.5), r, PALETTE.hair),
    disc(at(0.45, -0.1), r * 0.9, PALETTE.skin),
    capsule(at(0.6, -0.8), at(2.6, -3.5), 3.2, 1.5, PALETTE.skin), // jaw and chin
    capsule(at(-1.5, 3.4), at(2.6, 2.7), 1.6, 1.0, PALETTE.hair), // hairline
    disc(at(-0.9, -0.6), 1.05, PALETTE.skinShade), // ear
    capsule(at(2.4, 1.3), at(3.7, 1.0), 0.35, 0.3, PALETTE.hair), // brow
    disc(at(3.1, 0.2), 0.42, PALETTE.hair), // eye
    disc(at(4.4, -0.9), 0.9, PALETTE.skin), // nose, so it's clear which way they face
    capsule(at(3.4, -2.6), at(4.0, -2.5), 0.25, 0.25, PALETTE.lip),
  ];
}

/**
 * Shapes in paint order. Side view: far limbs first (shaded, as they're
 * further from the light), then the body and head, then near limbs on top.
 * Front view: legs, body, arms (so hands on hips sit over the shirt), head.
 */
export function bodyShapes(s: Skeleton, view: View): Shape[] {
  if (view === "front") {
    return [
      ...leg(s, "far", view, false),
      ...leg(s, "near", view, false),
      ...torso(s, view),
      ...arm(s, "far", view, false),
      ...arm(s, "near", view, false),
      ...head(s, view),
    ];
  }
  return [
    ...arm(s, "far", view, true),
    ...leg(s, "far", view, true),
    ...torso(s, view),
    ...head(s, view),
    ...leg(s, "near", view, false),
    ...arm(s, "near", view, false),
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
