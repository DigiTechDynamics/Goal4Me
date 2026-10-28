import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { moneyKeys } from "./api";

export const TRACK_LABEL: Record<string, string> = {
  budgeting: "Budgeting",
  saving: "Saving",
  debt: "Debt",
  investing: "Investing",
  side_income: "Side income",
};
export const TRACK_ORDER = ["budgeting", "saving", "debt", "investing", "side_income"];

export interface LessonSummary {
  id: string;
  slug: string;
  track: string;
  position: number;
  title: string;
  isPremium: boolean;
  completed: boolean;
  quizScore: number | null;
}

/**
 * All published lessons in track order, with the user's progress. Reads the
 * lesson_catalog view, which lists premium lessons' titles even to free users
 * (the lessons table itself hides their content).
 */
export function useLessons(userId: string) {
  return useQuery({
    queryKey: moneyKeys.lessons(userId),
    // Lessons change rarely; keep them a day (and offline via persistence).
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<LessonSummary[]> => {
      const db = getSupabase();
      const [lessons, progress] = await Promise.all([
        db.from("lesson_catalog").select("id, slug, track, position, title, is_premium"),
        db.from("lesson_progress").select("lesson_id, quiz_score").eq("user_id", userId),
      ]);
      if (lessons.error) throw lessons.error;
      if (progress.error) throw progress.error;
      const done = new Map((progress.data ?? []).map((row) => [row.lesson_id, row.quiz_score]));
      return (lessons.data ?? [])
        .map((row) => ({
          id: row.id,
          slug: row.slug,
          track: row.track,
          position: row.position,
          title: row.title,
          isPremium: row.is_premium,
          completed: done.has(row.id),
          quizScore: done.get(row.id) ?? null,
        }))
        .sort(
          (a, b) =>
            TRACK_ORDER.indexOf(a.track) - TRACK_ORDER.indexOf(b.track) || a.position - b.position,
        );
    },
  });
}

/** The quiz JSON is validated, so a bad content edit can't crash the lesson screen. */
const quizSchema = z
  .array(
    z.object({
      question: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      answer: z.number().int().nonnegative(),
    }),
  )
  .transform((questions) => questions.filter((q) => q.answer < q.options.length));
export type Quiz = z.infer<typeof quizSchema>;

export interface Lesson {
  id: string;
  track: string;
  title: string;
  body: string;
  quiz: Quiz;
  action: string | null;
}

/** Null when the lesson is premium and the user isn't (the database hides it). */
export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: moneyKeys.lesson(lessonId),
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Lesson | null> => {
      const { data, error } = await getSupabase()
        .from("lessons")
        .select("id, track, title, body_md, quiz, action")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const quiz = quizSchema.safeParse(data.quiz);
      return {
        id: data.id,
        track: data.track,
        title: data.title,
        body: data.body_md,
        quiz: quiz.success ? quiz.data : [],
        action: data.action,
      };
    },
  });
}

export function useCompleteLesson(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, score }: { lessonId: string; score: number }) => {
      const { error } = await getSupabase().rpc("complete_lesson", {
        p_lesson_id: lessonId,
        p_quiz_score: score,
      });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: moneyKeys.lessons(userId) }),
  });
}

export { parseLessonBody, type LessonBlock } from "./lessonBody";
