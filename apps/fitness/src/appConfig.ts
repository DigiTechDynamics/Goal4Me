import { APP_NAMES, configureApp } from "@goal4me/app-kit/app/config";
import { useHealthSettings } from "@/features/health/sync";
import { useOnboardingStore } from "@/features/onboarding/store";
import { useRunQueue } from "@/features/running/sync";
import { useSyncQueue } from "@/features/workouts/syncQueue";

/**
 * Registers Goal4Me Fit with the shared kit. Imported first by the root
 * layout, so it runs before any screen renders.
 */
configureApp({
  id: "fitness",
  name: APP_NAMES.fitness,
  startHref: "/quiz",
  startLabel: "Get your plan",
  signUp: {
    title: "Save your plan",
    subtitle: "Create a free account to track your workouts, runs and weight.",
    pendingNote: "Your plan is saved on this phone and will be added to your account.",
  },
  premiumBenefits: [
    "Every workout in your 4-week programme, adapted to you",
    "Every run in your running plan, from 5K to marathon",
    "New programmes as they launch",
    `All 30 money lessons and quizzes in ${APP_NAMES.money}`,
    "Support Goal4Me's development",
  ],
  disclaimer:
    "Goal4Me Fit provides general fitness education. It is not medical advice. Check with a doctor before starting a new exercise programme.",
  clearLocalData({ userId, deletingAccount }) {
    useOnboardingStore.getState().reset();
    // Health permission belongs to the phone's owner: the next account must opt in again.
    useHealthSettings.getState().setEnabled(false);
    // Unsynced workouts and runs survive a normal sign-out (they are sent on
    // the next sign-in); deleting the account drops them too.
    if (deletingAccount && userId) {
      const workouts = useSyncQueue.getState();
      for (const w of workouts.pending.filter((p) => p.userId === userId))
        workouts.remove(w.sessionId);
      const runs = useRunQueue.getState();
      for (const run of runs.pending.filter((p) => p.userId === userId)) runs.remove(run.sessionId);
    }
  },
});
