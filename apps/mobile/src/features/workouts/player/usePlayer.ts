import type { WorkoutStep } from "@goal4me/core";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Platform } from "react-native";
import { initialPlayerState, playerReducer, type PlayerAction } from "./machine";

/** Spoken cue for a step, e.g. "Push-up. 12 reps" or "Rest. Next: Squat". */
function cueFor(step: WorkoutStep): string {
  if (step.kind === "rest") return `Rest. Next: ${step.next.name}`;
  const amount = step.reps !== null ? `${step.reps} reps` : `${step.seconds} seconds`;
  return `${step.exercise.name}. ${amount}`;
}

/** Drives the state machine with a 1-second clock, voice cues and haptics. */
export function usePlayer(steps: readonly WorkoutStep[], voice: boolean) {
  const [state, dispatchRaw] = useReducer(
    (s: ReturnType<typeof initialPlayerState>, a: PlayerAction) => playerReducer(s, a, steps),
    undefined,
    initialPlayerState,
  );
  const dispatch = useCallback((action: PlayerAction) => dispatchRaw(action), []);

  const ticking = state.status === "running" || state.status === "ready";
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(timer);
  }, [ticking, dispatch]);

  // Announce each new step once.
  const announced = useRef(-1);
  useEffect(() => {
    if (state.status !== "running" || announced.current === state.index) return;
    announced.current = state.index;
    const step = steps[state.index];
    if (!step) return;
    if (Platform.OS !== "web")
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (voice) {
      Speech.stop();
      Speech.speak(cueFor(step), { rate: 1.0 });
    }
  }, [state.status, state.index, steps, voice]);

  // Short "3, 2, 1" beeps (haptic ticks) at the end of every countdown.
  useEffect(() => {
    if (Platform.OS === "web" || state.status !== "running") return;
    if (state.remaining !== null && state.remaining <= 3 && state.remaining > 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [state.remaining, state.status]);

  useEffect(() => () => void Speech.stop(), []);

  return { state, dispatch };
}
