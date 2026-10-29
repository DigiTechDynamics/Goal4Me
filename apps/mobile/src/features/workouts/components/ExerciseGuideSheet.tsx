import type { ExerciseInfo } from "@goal4me/core";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, Button } from "@/components/ui";
import { colors, MAX_CONTENT_WIDTH, radii, spacing } from "@/theme/tokens";
import { ExerciseVisual } from "./ExerciseVisual";
import { MuscleChips } from "./MuscleChips";

/**
 * Full "How to do it" guide for one exercise: demo, what it works, step by
 * step, breathing, common mistakes, why it's in the plan and an easier option.
 * Opened from the workout overview and mid-workout (the player pauses).
 */
export function ExerciseGuideSheet({
  exercise,
  easierName,
  onClose,
}: {
  exercise: ExerciseInfo | null;
  /** Name of the regression, if the library has one. */
  easierName?: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={exercise !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      {exercise ? <Guide exercise={exercise} easierName={easierName} onClose={onClose} /> : null}
    </Modal>
  );
}

function Guide({
  exercise,
  easierName,
  onClose,
}: {
  exercise: ExerciseInfo;
  easierName?: string | null;
  onClose: () => void;
}) {
  const d = exercise.details;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <AppText variant="overline" color="brand" style={styles.flex}>
          How to do it
        </AppText>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={16}
        >
          <AppText variant="heading">✕</AppText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <AppText variant="title" accessibilityRole="header">
            {exercise.name}
          </AppText>
          {d?.description ? <AppText color="textMuted">{d.description}</AppText> : null}
          {d ? <MuscleChips muscles={d.muscles} max={6} /> : null}
          <ExerciseVisual exercise={exercise} />

          {d?.steps.length ? (
            <Section title="Step by step">
              {d.steps.map((text, i) => (
                <View key={text} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <AppText variant="caption" color="onBrand">
                      {i + 1}
                    </AppText>
                  </View>
                  <AppText style={styles.flex}>{text}</AppText>
                </View>
              ))}
            </Section>
          ) : null}

          {exercise.formTips.length ? (
            <Section title="Form cues">
              {exercise.formTips.map((tip) => (
                <AppText key={tip} color="textMuted">
                  • {tip}
                </AppText>
              ))}
            </Section>
          ) : null}

          {d?.breathing ? (
            <Section title="Breathing">
              <AppText color="textMuted">{d.breathing}</AppText>
            </Section>
          ) : null}

          {d?.mistakes.length ? (
            <Section title="Avoid these mistakes">
              {d.mistakes.map((text) => (
                <View key={text} style={styles.mistake}>
                  <AppText color="text">{text}</AppText>
                </View>
              ))}
            </Section>
          ) : null}

          {d?.benefit ? (
            <Section title="Why it's in your plan">
              <AppText color="textMuted">{d.benefit}</AppText>
            </Section>
          ) : null}

          {easierName ? (
            <AppText variant="caption" color="textSubtle">
              Too hard today? The easier version is {easierName}. We swap it in automatically if
              your answers or ratings call for it.
            </AppText>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Got it" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  column: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", gap: spacing.md },
  section: { gap: spacing.sm, paddingTop: spacing.sm },
  stepRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  mistake: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH + 2 * spacing.xl,
    alignSelf: "center",
  },
});
