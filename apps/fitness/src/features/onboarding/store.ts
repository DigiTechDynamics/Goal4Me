import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { EMPTY_DRAFT, type QuizDraft } from "./steps";

interface OnboardingState {
  draft: QuizDraft;
  stepIndex: number;
  /** Set when the quiz is finished; answers wait here until the user has an account. */
  completedAt: string | null;
  /** Set once the answers are saved to the user's account. */
  syncedForUserId: string | null;
  setAnswer: <K extends keyof QuizDraft>(key: K, value: QuizDraft[K]) => void;
  goTo: (index: number) => void;
  markCompleted: () => void;
  markSynced: (userId: string) => void;
  reset: () => void;
}

const initial = { draft: EMPTY_DRAFT, stepIndex: 0, completedAt: null, syncedForUserId: null };

/**
 * Quiz progress, persisted on the device so closing the app mid-quiz (or
 * waiting for an email confirmation) never loses the user's answers.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initial,
      setAnswer: (key, value) => set((state) => ({ draft: { ...state.draft, [key]: value } })),
      goTo: (index) => set({ stepIndex: Math.max(0, index) }),
      markCompleted: () => set({ completedAt: new Date().toISOString() }),
      markSynced: (userId) => set({ syncedForUserId: userId }),
      reset: () => set(initial),
    }),
    {
      name: "goal4me.onboarding.v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

/** True once saved quiz progress has been read from storage (async on native). */
export function useOnboardingHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useOnboardingStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useOnboardingStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}
