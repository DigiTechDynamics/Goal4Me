import { ADULT_AGE, BMI_BANDS, healthyWeightRange, LIMITS } from "@goal4me/core";
import { quizAnswersBaseSchema, quizAnswersSchema, type QuizAnswers } from "@goal4me/schemas";

/**
 * The onboarding quiz, defined as data. Screens render whatever this file
 * describes, so reordering or rewording a question never touches UI code.
 * Everything here is pure and unit-tested.
 */

export type Units = "metric" | "imperial";

/** Answers in progress. Measurements are always stored in metric. */
export type QuizDraft = Partial<QuizAnswers> & {
  units: Units;
  disclaimerAccepted?: boolean;
  healthConsent?: boolean;
};

export const EMPTY_DRAFT: QuizDraft = { units: "metric", limitations: [], problemAreas: [] };

export interface Option<V> {
  value: V;
  label: string;
  description?: string;
}

type AnswerKey = keyof QuizAnswers;

export type Step =
  | {
      id: string;
      kind: "single";
      field: AnswerKey;
      title: string;
      subtitle?: string;
      options: Option<string | number>[];
      optional?: boolean;
    }
  | {
      id: string;
      kind: "multi";
      field: "problemAreas" | "limitations";
      title: string;
      subtitle?: string;
      options: Option<string>[];
      noneLabel?: string;
    }
  | { id: string; kind: "number"; field: "age"; title: string; subtitle?: string }
  | {
      id: string;
      kind: "measure";
      field: "heightCm" | "weightKg" | "targetWeightKg";
      title: string;
      subtitle?: string;
    }
  | { id: "consent"; kind: "consent"; title: string; subtitle?: string };

export const STEPS: Step[] = [
  {
    id: "goal",
    kind: "single",
    field: "goal",
    title: "What's your main goal?",
    subtitle: "We'll build your plan around it.",
    options: [
      { value: "lose_weight", label: "Lose weight", description: "Burn fat with home workouts" },
      { value: "tone_up", label: "Tone up", description: "Firm up and feel stronger" },
      { value: "build_strength", label: "Build strength", description: "Master bodyweight moves" },
      { value: "get_flexible", label: "Get flexible", description: "Move better, ache less" },
    ],
  },
  {
    id: "sex",
    kind: "single",
    field: "sex",
    title: "What's your sex?",
    subtitle: "Used only to calculate your calorie needs accurately.",
    options: [
      { value: "female", label: "Female" },
      { value: "male", label: "Male" },
    ],
  },
  {
    id: "age",
    kind: "number",
    field: "age",
    title: "How old are you?",
    subtitle: `Goal4Me is for ages ${LIMITS.ageYears.min} and up.`,
  },
  { id: "height", kind: "measure", field: "heightCm", title: "How tall are you?" },
  { id: "weight", kind: "measure", field: "weightKg", title: "What's your current weight?" },
  { id: "target", kind: "measure", field: "targetWeightKg", title: "What's your target weight?" },
  {
    id: "activity",
    kind: "single",
    field: "activity",
    title: "How active is your typical day?",
    options: [
      { value: "sedentary", label: "Mostly sitting", description: "Desk job, little walking" },
      { value: "light", label: "Lightly active", description: "Some walking or standing" },
      { value: "moderate", label: "Moderately active", description: "On my feet most of the day" },
      { value: "active", label: "Very active", description: "Physical job or daily training" },
      {
        value: "very_active",
        label: "Extremely active",
        description: "Hard physical work and training",
      },
    ],
  },
  {
    id: "fitness",
    kind: "single",
    field: "fitnessLevel",
    title: "How many push-ups can you do in a row?",
    subtitle: "Knee push-ups count. Be honest, we'll adapt as you go.",
    options: [
      { value: "none", label: "None yet" },
      { value: "beginner", label: "1 to 5" },
      { value: "intermediate", label: "6 to 15" },
      { value: "advanced", label: "16 or more" },
    ],
  },
  {
    id: "areas",
    kind: "multi",
    field: "problemAreas",
    title: "Which areas do you want to focus on?",
    subtitle: "Pick as many as you like.",
    options: [
      { value: "arms", label: "Arms" },
      { value: "belly", label: "Belly" },
      { value: "legs", label: "Legs and glutes" },
      { value: "back", label: "Back and posture" },
      { value: "full_body", label: "Full body" },
    ],
  },
  {
    id: "limitations",
    kind: "multi",
    field: "limitations",
    title: "Anything we should go easy on?",
    subtitle: "We'll leave out exercises that strain these areas.",
    noneLabel: "No limitations",
    options: [
      { value: "knees", label: "Knees" },
      { value: "back", label: "Lower back" },
      { value: "wrists", label: "Wrists" },
    ],
  },
  {
    id: "days",
    kind: "single",
    field: "daysPerWeek",
    title: "How many days a week can you train?",
    options: [2, 3, 4, 5, 6].map((days) => ({
      value: days,
      label: `${days} days`,
      ...(days === 4 ? { description: "Most popular" } : {}),
    })),
  },
  {
    id: "minutes",
    kind: "single",
    field: "minutesPerSession",
    title: "How long should each workout be?",
    options: [
      { value: 10, label: "10 minutes", description: "Quick and effective" },
      { value: 15, label: "15 minutes", description: "Recommended" },
      { value: 20, label: "20 minutes" },
      { value: 30, label: "30 minutes" },
    ],
  },
  {
    id: "country",
    kind: "single",
    field: "country",
    title: "Where do you live?",
    subtitle: "Sets your currency for the money tools.",
    options: [
      { value: "ZW", label: "Zimbabwe" },
      { value: "ZA", label: "South Africa" },
      { value: "BW", label: "Botswana" },
      { value: "ZM", label: "Zambia" },
      { value: "MW", label: "Malawi" },
      { value: "US", label: "United States" },
      { value: "GB", label: "United Kingdom" },
      { value: "IN", label: "India" },
    ],
  },
  {
    id: "money",
    kind: "single",
    field: "moneyGoal",
    optional: true,
    title: "And your top money goal?",
    subtitle: "Goal4Me coaches your finances too. You can skip this.",
    options: [
      { value: "build_emergency_fund", label: "Build an emergency fund" },
      { value: "pay_off_debt", label: "Pay off debt" },
      { value: "save_for_purchase", label: "Save for something big" },
      { value: "start_investing", label: "Start investing" },
      { value: "budget_better", label: "Budget better" },
    ],
  },
  {
    id: "consent",
    kind: "consent",
    title: "Before we build your plan",
    subtitle: "Please read and agree to continue.",
  },
];

/** Index of a step in STEPS by id (throws on typos so tests catch them). */
export function stepIndex(id: string): number {
  const index = STEPS.findIndex((step) => step.id === id);
  if (index === -1) throw new Error(`Unknown step "${id}"`);
  return index;
}

/** The step at `index`, clamped to the valid range. */
export function stepAt(index: number): Step {
  const step = STEPS[Math.min(Math.max(index, 0), STEPS.length - 1)];
  if (!step) throw new Error("Quiz has no steps");
  return step;
}

/** Validates the answer for one step. Returns an error message, or null when valid. */
export function validateStep(step: Step, draft: QuizDraft): string | null {
  if (step.kind === "consent") {
    if (!draft.disclaimerAccepted || !draft.healthConsent)
      return "Please agree to both to continue";
    if (draft.age !== undefined && draft.age < ADULT_AGE && !draft.guardianConsent) {
      return "A parent or guardian must agree before you continue";
    }
    return null;
  }

  const value = draft[step.field];
  if (step.kind === "single" && step.optional && value === undefined) return null;
  if (value === undefined) return step.kind === "single" ? "Choose an option" : "Enter a value";

  const result = quizAnswersBaseSchema.shape[step.field].safeParse(value);
  if (!result.success) return result.error.issues[0]?.message ?? "Check this answer";

  if (step.field === "targetWeightKg" && draft.heightCm !== undefined) {
    const bmi = (value as number) / (draft.heightCm / 100) ** 2;
    if (bmi < BMI_BANDS.underweightBelow) {
      return `For your height, aim for at least ${healthyWeightRange(draft.heightCm).minKg} kg`;
    }
  }
  return null;
}

/** First step that still needs an answer, so a resumed quiz lands in the right place. */
export function firstIncompleteStep(draft: QuizDraft): number {
  const index = STEPS.findIndex((step) => validateStep(step, draft) !== null);
  return index === -1 ? STEPS.length - 1 : index;
}

/** Final, fully validated answers, or null if anything is still missing or invalid. */
export function toQuizAnswers(draft: QuizDraft): QuizAnswers | null {
  const { units, disclaimerAccepted, healthConsent, ...answers } = draft;
  if (!disclaimerAccepted || !healthConsent) return null;
  const result = quizAnswersSchema.safeParse(answers);
  return result.success ? result.data : null;
}
