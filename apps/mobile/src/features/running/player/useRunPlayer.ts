import type { RunSegment } from "@goal4me/core";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { SEGMENT_LABEL, spokenDuration } from "../copy";
import {
  initialRunPlayerState,
  positionAt,
  runPlayerReducer,
  type RunPlayerAction,
  type RunPlayerState,
} from "./machine";

type Command = RunPlayerAction["type"];

/** Spoken cue for a segment, e.g. "Run for 1 minute 30 seconds". */
function cueFor(segment: RunSegment, next: RunSegment | undefined): string {
  if (segment.kind === "race")
    return "Race time. Start steady and enjoy it. Tap finish when you cross the line.";
  if (segment.kind === "cooldown") return "Great work. Cool down with an easy walk.";
  const label = SEGMENT_LABEL[segment.kind];
  const then =
    next && next.kind !== "cooldown" ? ` Then ${SEGMENT_LABEL[next.kind].toLowerCase()}.` : "";
  return `${label} for ${spokenDuration(segment.seconds)}.${then}`;
}

/**
 * Drives the run machine with the real clock: re-renders twice a second,
 * catches up instantly when the app returns from the background, and
 * announces each new segment with voice and a vibration.
 */
export function useRunPlayer(segments: readonly RunSegment[], voice: boolean) {
  const [state, dispatchRaw] = useReducer(
    (s: RunPlayerState, a: RunPlayerAction) => runPlayerReducer(s, a, segments),
    undefined,
    initialRunPlayerState,
  );
  const dispatch = useCallback((type: Command) => dispatchRaw({ type, now: Date.now() }), []);
  const [now, setNow] = useState(() => Date.now());

  const live = state.status === "running";
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    const sub = AppState.addEventListener("change", (s) => s === "active" && setNow(Date.now()));
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [live]);

  // Paused or finished states ignore `now` (no running stretch), so one call fits all.
  const position = positionAt(state, segments, now);

  // Announce each new segment once (and the end of the plan).
  const announced = useRef(-1);
  useEffect(() => {
    if (state.status !== "running" || announced.current === position.index) return;
    announced.current = position.index;
    const segment = segments[position.index];
    if (Platform.OS !== "web")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!voice) return;
    Speech.stop();
    Speech.speak(
      segment ? cueFor(segment, segments[position.index + 1]) : "Run complete. Well done!",
    );
  }, [state.status, position.index, segments, voice]);

  // A light tap for each of the last 3 seconds of a segment.
  useEffect(() => {
    if (Platform.OS === "web" || state.status !== "running") return;
    if (position.remaining !== null && position.remaining <= 3 && position.remaining > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [position.remaining, state.status]);

  useEffect(() => () => void Speech.stop(), []);

  return { state, position, dispatch };
}
