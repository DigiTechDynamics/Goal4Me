import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { saveOnboarding } from "./api";
import { toQuizAnswers } from "./steps";
import { useOnboardingStore } from "./store";

type SyncStatus = "idle" | "saving" | "error";

/**
 * After sign-in, saves quiz answers that were completed before the account
 * existed. Runs once per user; a failure can be retried from the UI.
 */
export function useSyncPendingQuiz(userId: string) {
  const queryClient = useQueryClient();
  const { draft, completedAt, syncedForUserId, markSynced } = useOnboardingStore();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [attempt, setAttempt] = useState(0);

  const pending = completedAt !== null && syncedForUserId !== userId;

  useEffect(() => {
    if (!pending) return;
    const answers = toQuizAnswers(draft);
    if (!answers) {
      logger.warn("Stored quiz answers are incomplete; skipping sync");
      return;
    }
    let cancelled = false;
    setStatus("saving");
    saveOnboarding(answers, draft.units)
      .then(async () => {
        if (cancelled) return;
        markSynced(userId);
        setStatus("idle");
        await queryClient.invalidateQueries({ queryKey: ["home-summary", userId] });
      })
      .catch((error: unknown) => {
        logger.error("Saving quiz answers failed", { error: String(error) });
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // `attempt` lets the UI trigger a retry.
  }, [pending, draft, userId, markSynced, queryClient, attempt]);

  return { pending, status, retry: () => setAttempt((n) => n + 1) };
}
