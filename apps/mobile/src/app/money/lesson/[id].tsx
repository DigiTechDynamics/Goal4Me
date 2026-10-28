import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Card, ChoiceCard, ProgressBar, Screen } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import { useIsPremium } from "@/features/billing/api";
import { LockedCard } from "@/features/billing/components/LockedCard";
import { openPaywall } from "@/features/billing/gating";
import {
  parseLessonBody,
  TRACK_LABEL,
  useCompleteLesson,
  useLesson,
  useLessons,
  type Lesson,
} from "@/features/money/lessons";
import { toUserMessage } from "@/lib/errors";
import { spacing } from "@/theme/tokens";

type Phase = { step: "read" } | { step: "quiz"; index: number } | { step: "done" };

/** A lesson: read, answer the quiz one question at a time, then take the action. */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = useLesson(id);

  if (lesson.isPending) return <LoadingView />;
  if (lesson.isError) {
    return (
      <ErrorView message={toUserMessage(lesson.error)} onRetry={() => void lesson.refetch()} />
    );
  }
  if (!lesson.data) {
    return (
      <Screen>
        <BackButton variant="close" />
        <LockedCard
          reason="lesson"
          title="This is a Premium lesson"
          message="Your 3 free lessons cover budgeting, saving and debt. Premium unlocks all 30, from emergency funds to investing and side income."
        />
      </Screen>
    );
  }
  // Remount per lesson so "Next lesson" starts fresh.
  return <LessonFlow key={lesson.data.id} lesson={lesson.data} />;
}

function LessonFlow({ lesson }: { lesson: Lesson }) {
  const userId = useUserId();
  const complete = useCompleteLesson(userId);
  const all = useLessons(userId);
  const isPremium = useIsPremium(userId);
  const [phase, setPhase] = useState<Phase>({ step: "read" });
  const [answers, setAnswers] = useState<(number | null)[]>(() => lesson.quiz.map(() => null));

  const score = answers.filter((a, i) => a !== null && a === lesson.quiz[i]?.answer).length;
  const order = all.data ?? [];
  const nextLesson = order[order.findIndex((l) => l.id === lesson.id) + 1];

  const finishQuiz = () => {
    setPhase({ step: "done" });
    complete.mutate({ lessonId: lesson.id, score: Math.min(3, score) });
  };

  if (phase.step === "read") {
    return (
      <Screen
        footer={
          <Button
            label={lesson.quiz.length ? "Take the quiz" : "Finish lesson"}
            onPress={() =>
              lesson.quiz.length ? setPhase({ step: "quiz", index: 0 }) : finishQuiz()
            }
          />
        }
      >
        <BackButton variant="close" />
        <AppText variant="overline" color="brand">
          {TRACK_LABEL[lesson.track] ?? lesson.track}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {lesson.title}
        </AppText>
        {parseLessonBody(lesson.body).map((block, i) =>
          block.type === "paragraph" ? (
            <AppText key={i} style={styles.body}>
              {block.text}
            </AppText>
          ) : (
            <View key={i} style={styles.list}>
              {block.items.map((item) => (
                <View key={item} style={styles.bullet}>
                  <AppText color="brand">•</AppText>
                  <AppText style={[styles.body, styles.flex]}>{item}</AppText>
                </View>
              ))}
            </View>
          ),
        )}
      </Screen>
    );
  }

  if (phase.step === "quiz") {
    const question = lesson.quiz[phase.index];
    if (!question) return null;
    const chosen = answers[phase.index] ?? null;
    const isLast = phase.index === lesson.quiz.length - 1;
    return (
      <Screen
        footer={
          <Button
            label={isLast ? "See my score" : "Next question"}
            disabled={chosen === null}
            onPress={() =>
              isLast ? finishQuiz() : setPhase({ step: "quiz", index: phase.index + 1 })
            }
          />
        }
      >
        <BackButton variant="close" />
        <ProgressBar value={(phase.index + 1) / lesson.quiz.length} />
        <AppText variant="caption" color="textMuted">
          Question {phase.index + 1} of {lesson.quiz.length}
        </AppText>
        <AppText variant="heading" accessibilityRole="header">
          {question.question}
        </AppText>
        <View style={styles.options} accessibilityRole="radiogroup">
          {question.options.map((option, i) => (
            <ChoiceCard
              key={option}
              label={option}
              selected={chosen === i}
              // Lock the answer once chosen, so the feedback below stays honest.
              onPress={() =>
                chosen === null &&
                setAnswers((prev) => prev.map((a, q) => (q === phase.index ? i : a)))
              }
            />
          ))}
        </View>
        {chosen !== null ? (
          <Banner
            tone={chosen === question.answer ? "success" : "warning"}
            message={
              chosen === question.answer
                ? "Correct!"
                : `Not quite. The answer is: ${question.options[question.answer]}`
            }
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          {nextLesson ? (
            <Button
              label="Next lesson"
              onPress={() =>
                nextLesson.isPremium && !isPremium
                  ? openPaywall("lesson")
                  : router.replace({
                      pathname: "/money/lesson/[id]",
                      params: { id: nextLesson.id },
                    })
              }
            />
          ) : null}
          <Button label="Back to Money" variant="secondary" onPress={() => router.back()} />
        </>
      }
    >
      <BackButton variant="close" />
      <AppText variant="overline" color="brand">
        Lesson complete
      </AppText>
      <AppText variant="display">
        {score}/{lesson.quiz.length}
      </AppText>
      <AppText color="textMuted">
        {score === lesson.quiz.length
          ? "Perfect score. You've got this."
          : "Nice work. You can retake the quiz any time to improve your score."}
      </AppText>
      {complete.isError ? (
        <Banner message={`${toUserMessage(complete.error)} Your progress wasn't saved yet.`} />
      ) : null}
      {complete.isError ? (
        <Button
          label="Try saving again"
          variant="secondary"
          loading={complete.isPending}
          onPress={() => complete.mutate({ lessonId: lesson.id, score: Math.min(3, score) })}
        />
      ) : null}
      {lesson.action ? (
        <Card>
          <AppText variant="overline" color="textMuted">
            Your action
          </AppText>
          <AppText variant="bodyStrong">{lesson.action}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { lineHeight: 24 },
  list: { gap: spacing.sm },
  bullet: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  options: { gap: spacing.md },
});
