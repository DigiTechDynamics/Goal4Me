import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import Svg, { Circle, G, Line, Rect } from "react-native-svg";
import type { ExerciseMotion as Motion } from "../motion/motions";
import { placeProp, type PlacedProp } from "../motion/props";
import { CANVAS, frameAt, framing, type Point } from "../motion/skeleton";
import { colors } from "@/theme/tokens";

/** Redraws per second; plenty for a smooth figure, light on battery. */
const FPS = 30;
const LIMB = 4.2;

/** Follows the OS "reduce motion" setting; true means show a still pose. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setReduce(value))
      .catch(() => undefined); // unsupported platform: keep animating
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Seconds elapsed while `running`, ticking at most FPS times a second via
 * requestAnimationFrame (paused when hidden, so it costs nothing off-screen).
 */
function useClock(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let start: number | null = null;
    let last = 0;
    const tick = (now: number) => {
      start ??= now - last * 1000;
      const elapsed = (now - start) / 1000;
      if (elapsed - last >= 1 / FPS) {
        last = elapsed;
        setSeconds(elapsed);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  return seconds;
}

/**
 * Original animated figure demonstrating an exercise (vector shapes only).
 * Loops while `playing`; with reduce motion on it holds the key position
 * (the second keyframe: the bottom of a squat, the top of a raise).
 */
export function ExerciseMotion({ motion, playing = true }: { motion: Motion; playing?: boolean }) {
  const reduce = useReduceMotion();
  const seconds = useClock(playing && !reduce);
  const { anchorX, scale } = useMemo(() => framing(motion), [motion]);
  const prop = useMemo(() => placeProp(motion, anchorX), [motion, anchorX]);
  const time = reduce ? motion.beat : seconds;
  const s = frameAt(motion, time, anchorX);
  // Scale about the floor's centre so the figure stays grounded and centred.
  const cx = CANVAS.width / 2;
  const transform = `translate(${cx} ${CANVAS.floor}) scale(${scale}) translate(${-cx} ${-CANVAS.floor})`;
  // Side view: far limbs are behind the body, so they're drawn first and dimmer.
  const farOpacity = motion.view === "side" ? 0.4 : 1;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
      <Line
        x1={4}
        y1={CANVAS.floor + LIMB / 2}
        x2={CANVAS.width - 4}
        y2={CANVAS.floor + LIMB / 2}
        stroke={colors.border}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <G transform={transform}>
        {prop && <PropShape prop={prop} />}
        <G opacity={farOpacity}>
          <Chain points={[s.shoulderFar, s.elbowFar, s.handFar]} />
          <Chain points={[s.hipFar, s.kneeFar, s.footFar]} />
        </G>
        {motion.view === "front" && <Chain points={[s.shoulderFar, s.shoulderNear]} />}
        {motion.view === "front" && <Chain points={[s.hipFar, s.hipNear]} />}
        <Chain points={[s.hip, s.neck]} width={LIMB * 1.5} />
        <Circle cx={s.head.x} cy={s.head.y} r={5.5} fill={colors.brand} />
        <Chain points={[s.hipNear, s.kneeNear, s.footNear]} />
        <Chain points={[s.shoulderNear, s.elbowNear, s.handNear]} />
      </G>
    </Svg>
  );
}

/** A limb drawn as joined rounded segments. */
function Chain({ points, width = LIMB }: { points: Point[]; width?: number }) {
  return (
    <>
      {points.slice(1).map((to, i) => {
        const from = points[i] as Point;
        return (
          <Line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={colors.brand}
            strokeWidth={width}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

function PropShape({ prop }: { prop: PlacedProp }) {
  if (prop.kind === "wall") {
    return (
      <Rect
        x={prop.x}
        y={-CANVAS.height}
        width={prop.width}
        height={CANVAS.floor + CANVAS.height}
        fill={colors.surfaceRaised}
        stroke={colors.border}
        strokeWidth={0.8}
      />
    );
  }
  const width = prop.backX - prop.frontX;
  return (
    <G>
      <Rect
        x={prop.frontX}
        y={prop.seatY}
        width={width}
        height={3}
        rx={1}
        fill={colors.surfaceRaised}
        stroke={colors.border}
        strokeWidth={0.8}
      />
      {[prop.frontX + 1.5, prop.backX - 1.5].map((x) => (
        <Line
          key={x}
          x1={x}
          y1={prop.seatY + 3}
          x2={x}
          y2={CANVAS.floor}
          stroke={colors.border}
          strokeWidth={1.6}
        />
      ))}
    </G>
  );
}
