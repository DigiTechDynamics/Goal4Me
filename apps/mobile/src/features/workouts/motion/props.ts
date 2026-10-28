import { CANVAS, frameAt } from "./skeleton";
import type { ExerciseMotion } from "./motions";

/** A prop resolved to canvas coordinates, ready to draw. */
export type PlacedProp =
  | { kind: "wall"; x: number; width: number }
  | { kind: "chair"; seatY: number; frontX: number; backX: number };

const WALL_GAP = 3; // half a limb's stroke plus a hair, so contact reads as touching
const SEAT_DEPTH = 16;
const WALL_WIDTH = 4;

/**
 * Where to draw a motion's prop. Props don't move, so they are placed once
 * from the first keyframe: a wall just past the contact joint, a chair seat
 * level with it (the hands in a dip) and extending behind or in front.
 */
export function placeProp(motion: ExerciseMotion, anchorX: number): PlacedProp | null {
  const { prop } = motion;
  if (!prop) return null;
  const contact = frameAt(motion, 0, anchorX)[prop.joint];
  const dir = prop.side === "front" ? 1 : -1;
  if (prop.kind === "wall") {
    // `x` is the wall's left edge; it always sits on the far side of the contact.
    const face = contact.x + dir * WALL_GAP;
    return { kind: "wall", x: dir > 0 ? face : face - WALL_WIDTH, width: WALL_WIDTH };
  }
  const edge = contact.x - dir * 1;
  const far = edge + dir * SEAT_DEPTH;
  return {
    kind: "chair",
    seatY: Math.min(contact.y + 1.5, CANVAS.floor - 4),
    frontX: Math.min(edge, far),
    backX: Math.max(edge, far),
  };
}
