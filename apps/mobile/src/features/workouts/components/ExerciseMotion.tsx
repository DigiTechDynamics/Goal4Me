import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";
import Svg, { Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import type { ExerciseMotion as Motion } from "../motion/motions";
import { bodyShapes, floorShadow } from "../motion/body";
import { placeProp, type PlacedProp } from "../motion/props";
import { frameAt } from "../motion/playback";
import { CANVAS, framing } from "../motion/skeleton";
import { colors } from "@/theme/tokens";

/** Redraws per second; plenty for a smooth figure, light on battery. */
const FPS = 30;

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
 * Original animated athlete demonstrating an exercise (vector shapes only).
 * Loops while `playing`. With reduce motion on, or `still` (thumbnails), it
 * holds the key position: the second keyframe, e.g. the bottom of a squat.
 */
export function ExerciseMotion({
  motion,
  playing = true,
  still = false,
}: {
  motion: Motion;
  playing?: boolean;
  still?: boolean;
}) {
  const reduce = useReduceMotion();
  const hold = reduce || still;
  const seconds = useClock(playing && !hold);
  const { anchorX, scale } = useMemo(() => framing(motion), [motion]);
  const prop = useMemo(() => placeProp(motion, anchorX), [motion, anchorX]);
  const s = frameAt(motion, hold ? motion.beat : seconds, anchorX);
  const shapes = bodyShapes(s, motion.view);
  const shadow = floorShadow(s);
  // Scale about the floor's centre so the figure stays grounded and centred.
  const cx = CANVAS.width / 2;
  const transform = `translate(${cx} ${CANVAS.floor}) scale(${scale}) translate(${-cx} ${-CANVAS.floor})`;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}>
      <Defs>
        <RadialGradient id="spot" cx="50%" cy="62%" rx="58%" ry="70%">
          <Stop offset="0" stopColor={colors.surfaceRaised} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.surface} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={CANVAS.width} height={CANVAS.height} fill="url(#spot)" />
      <Rect
        x={0}
        y={CANVAS.floor}
        width={CANVAS.width}
        height={CANVAS.height - CANVAS.floor}
        fill={colors.surfaceRaised}
        opacity={0.6}
      />
      <G transform={transform}>
        {prop && <PropShape prop={prop} />}
        <Ellipse
          cx={shadow.cx}
          cy={CANVAS.floor + 0.6}
          rx={shadow.rx}
          ry={1.8}
          fill="#000"
          opacity={0.35}
        />
        {shapes.map((shape, i) => (
          <Path key={i} d={shape.d} fill={shape.fill} opacity={shape.opacity ?? 1} />
        ))}
      </G>
    </Svg>
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
        fill={colors.border}
      />
    );
  }
  const width = prop.backX - prop.frontX;
  return (
    <G>
      {[prop.frontX + 1.5, prop.backX - 1.5].map((x) => (
        <Rect
          key={x}
          x={x - 0.9}
          y={prop.seatY + 2}
          width={1.8}
          height={CANVAS.floor - prop.seatY - 2}
          fill={colors.textSubtle}
        />
      ))}
      <Rect x={prop.frontX} y={prop.seatY} width={width} height={3.2} rx={1.2} fill="#7A5A3A" />
    </G>
  );
}
