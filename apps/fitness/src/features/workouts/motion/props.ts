import { frameAt } from "./playback";
import { CANVAS } from "./skeleton";
import type { ExerciseMotion } from "./motions";

/** A prop resolved to canvas coordinates, ready to draw. */
export type PlacedProp =
  | { kind: "wall"; x: number; width: number }
  | { kind: "chair"; seatY: number; frontX: number; backX: number };

const SEAT_DEPTH = 16;
const WALL_WIDTH = 4;
/** A flat palm sits this far below the wrist joint. */
const PALM_DEPTH = 1.1;

/**
 * Where to draw a motion's prop. Props don't move, so they are placed once
 * from the first keyframe: a wall `gap` past the contact joint (the body's
 * surface there), or a chair seat under the contact (the hands in a dip),
 * extending behind or in front of it.
 */
export function placeProp(motion: ExerciseMotion, anchorX: number): PlacedProp | null {
  const { prop } = motion;
  if (!prop) return null;
  const contact = frameAt(motion, 0, anchorX)[prop.joint];
  const dir = prop.side === "front" ? 1 : -1;
  if (prop.kind === "wall") {
    // `x` is the wall's left edge; it always sits on the far side of the contact.
    const face = contact.x + dir * (prop.gap ?? 0.3);
    return { kind: "wall", x: dir > 0 ? face : face - WALL_WIDTH, width: WALL_WIDTH };
  }
  // The fingers curl over the seat's front edge.
  const edge = contact.x - dir * 1;
  const far = edge + dir * SEAT_DEPTH;
  return {
    kind: "chair",
    seatY: Math.min(contact.y + PALM_DEPTH, CANVAS.floor - 4),
    frontX: Math.min(edge, far),
    backX: Math.max(edge, far),
  };
}
