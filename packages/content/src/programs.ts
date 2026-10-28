import type { FitnessLevel, Goal, ProgramSlug, WorkoutPhase } from "@goal4me/core";

/**
 * Programme templates. Each programme repeats a weekly pattern of workouts
 * ("A", "B", "C") and rest days ("R") for 4 weeks, getting harder each week:
 * +2 reps or +5 seconds per week, and one extra round from week 3.
 */

/** A main-block exercise: `reps` OR `seconds`. */
export type Move = { slug: string; reps: number } | { slug: string; seconds: number };

export interface WorkoutTemplate {
  title: string;
  warmup: { slug: string; seconds: number }[];
  main: Move[];
  cooldown: { slug: string; seconds: number }[];
  rounds: number;
  restSeconds: number;
}

export interface ProgramSeed {
  slug: ProgramSlug;
  name: string;
  description: string;
  goal: Goal;
  level: FitnessLevel;
  /** 7 characters, one per weekday: a template key or "R" for rest. */
  week: string;
  templates: Record<string, WorkoutTemplate>;
}

export const WEEKS = 4;

/**
 * Stand-ins for main-block moves a user can't do safely (in order of
 * preference). Every one is contraindication-free and beginner-level.
 */
export const FALLBACK_SLUGS = [
  "dead-bug",
  "glute-bridge",
  "wall-angels",
  "side-leg-raise",
  "calf-raise",
  "forearm-plank",
];

const WARMUP_STANDARD = [
  { slug: "march-in-place", seconds: 40 },
  { slug: "arm-circles", seconds: 30 },
  { slug: "hip-circles", seconds: 30 },
];
const WARMUP_CARDIO = [
  { slug: "march-in-place", seconds: 30 },
  { slug: "jumping-jacks", seconds: 30 },
  { slug: "arm-circles", seconds: 30 },
];
const COOLDOWN_STANDARD = [
  { slug: "hamstring-stretch", seconds: 30 },
  { slug: "quad-stretch", seconds: 30 },
  { slug: "childs-pose", seconds: 40 },
];
const COOLDOWN_SPINE = [
  { slug: "cat-cow", seconds: 40 },
  { slug: "cobra-stretch", seconds: 30 },
  { slug: "childs-pose", seconds: 40 },
];

export const PROGRAM_SEEDS: ProgramSeed[] = [
  {
    slug: "calisthenics-beginners",
    name: "Calisthenics for Beginners",
    description: "Learn the foundations: push-ups, squats, planks and bridges, step by step.",
    goal: "build_strength",
    level: "beginner",
    week: "ARBRARB",
    templates: {
      A: {
        title: "Push and core",
        warmup: WARMUP_STANDARD,
        main: [
          { slug: "knee-push-up", reps: 8 },
          { slug: "glute-bridge", reps: 12 },
          { slug: "forearm-plank", seconds: 20 },
          { slug: "chair-dip", reps: 8 },
          { slug: "dead-bug", reps: 10 },
        ],
        cooldown: COOLDOWN_STANDARD,
        rounds: 2,
        restSeconds: 30,
      },
      B: {
        title: "Legs and balance",
        warmup: WARMUP_STANDARD,
        main: [
          { slug: "squat", reps: 12 },
          { slug: "reverse-lunge", reps: 8 },
          { slug: "calf-raise", reps: 15 },
          { slug: "side-plank", seconds: 15 },
          { slug: "bird-dog", reps: 10 },
        ],
        cooldown: COOLDOWN_STANDARD,
        rounds: 2,
        restSeconds: 30,
      },
    },
  },
  {
    slug: "fat-burn-home",
    name: "Fat Burn at Home",
    description: "Short, sweaty circuits that keep your heart rate up, no equipment needed.",
    goal: "lose_weight",
    level: "beginner",
    week: "ARBRARB",
    templates: {
      A: {
        title: "Full-body burn",
        warmup: WARMUP_CARDIO,
        main: [
          { slug: "squat", reps: 15 },
          { slug: "boxing-punches", seconds: 30 },
          { slug: "knee-push-up", reps: 10 },
          { slug: "high-knees", seconds: 25 },
          { slug: "bicycle-crunch", reps: 16 },
          { slug: "skater-hops", seconds: 25 },
        ],
        cooldown: COOLDOWN_STANDARD,
        rounds: 2,
        restSeconds: 20,
      },
      B: {
        title: "Cardio core",
        warmup: WARMUP_CARDIO,
        main: [
          { slug: "jumping-jacks", seconds: 30 },
          { slug: "mountain-climbers", seconds: 25 },
          { slug: "reverse-lunge", reps: 10 },
          { slug: "squat-thrust", reps: 8 },
          { slug: "forearm-plank", seconds: 25 },
          { slug: "step-touch", seconds: 30 },
        ],
        cooldown: COOLDOWN_STANDARD,
        rounds: 2,
        restSeconds: 20,
      },
    },
  },
  {
    slug: "wall-pilates",
    name: "Wall Pilates",
    description: "Low-impact moves using a wall for support. Kind to knees and backs.",
    goal: "get_flexible",
    level: "none",
    week: "ARBRARB",
    templates: {
      A: {
        title: "Lower body and core",
        warmup: [
          { slug: "march-in-place", seconds: 30 },
          { slug: "hip-circles", seconds: 30 },
          { slug: "wall-angels", seconds: 40 },
        ],
        main: [
          { slug: "wall-glute-bridge", reps: 12 },
          { slug: "side-leg-raise", reps: 12 },
          { slug: "dead-bug", reps: 10 },
          { slug: "calf-raise", reps: 15 },
          { slug: "wall-push-up", reps: 10 },
        ],
        cooldown: [
          { slug: "wall-hamstring-stretch", seconds: 45 },
          { slug: "cat-cow", seconds: 40 },
          { slug: "childs-pose", seconds: 40 },
        ],
        rounds: 2,
        restSeconds: 25,
      },
      B: {
        title: "Posture and mobility",
        warmup: [
          { slug: "arm-circles", seconds: 30 },
          { slug: "cat-cow", seconds: 40 },
          { slug: "wall-angels", seconds: 40 },
        ],
        main: [
          { slug: "bird-dog", reps: 10 },
          { slug: "glute-bridge", reps: 12 },
          { slug: "wall-angels", reps: 10 },
          { slug: "side-plank", seconds: 15 },
          { slug: "dead-bug", reps: 10 },
        ],
        cooldown: [
          { slug: "wall-hamstring-stretch", seconds: 45 },
          { slug: "childs-pose", seconds: 45 },
        ],
        rounds: 2,
        restSeconds: 25,
      },
    },
  },
  {
    slug: "strength-builder",
    name: "Strength Builder",
    description: "Harder calisthenics for people who already train: more reps, harder variations.",
    goal: "build_strength",
    level: "intermediate",
    week: "ABRCABR",
    templates: {
      A: {
        title: "Upper body",
        warmup: WARMUP_CARDIO,
        main: [
          { slug: "push-up", reps: 12 },
          { slug: "pike-push-up", reps: 8 },
          { slug: "chair-dip", reps: 12 },
          { slug: "diamond-push-up", reps: 8 },
          { slug: "plank-shoulder-taps", reps: 20 },
        ],
        cooldown: COOLDOWN_SPINE,
        rounds: 3,
        restSeconds: 30,
      },
      B: {
        title: "Lower body",
        warmup: WARMUP_CARDIO,
        main: [
          { slug: "squat-jump", reps: 10 },
          { slug: "split-squat", reps: 10 },
          { slug: "single-leg-glute-bridge", reps: 10 },
          { slug: "wall-sit", seconds: 40 },
          { slug: "calf-raise", reps: 20 },
        ],
        cooldown: COOLDOWN_STANDARD,
        rounds: 3,
        restSeconds: 30,
      },
      C: {
        title: "Core and conditioning",
        warmup: WARMUP_CARDIO,
        main: [
          { slug: "burpee", reps: 8 },
          { slug: "hollow-hold", seconds: 25 },
          { slug: "mountain-climbers", seconds: 30 },
          { slug: "leg-raise", reps: 12 },
          { slug: "side-plank", seconds: 30 },
        ],
        cooldown: COOLDOWN_SPINE,
        rounds: 3,
        restSeconds: 30,
      },
    },
  },
];

export interface ProgramDaySeed {
  dayNumber: number;
  title: string;
  isRestDay: boolean;
  items: {
    position: number;
    slug: string;
    phase: WorkoutPhase;
    rounds: number;
    targetReps: number | null;
    targetSeconds: number | null;
    restSeconds: number;
  }[];
}

/** Expands a programme into its 28 days with weekly progression. */
export function expandProgram(program: ProgramSeed): ProgramDaySeed[] {
  const days: ProgramDaySeed[] = [];
  for (let week = 0; week < WEEKS; week++) {
    for (let weekday = 0; weekday < 7; weekday++) {
      const dayNumber = week * 7 + weekday + 1;
      const key = program.week[weekday] ?? "R";
      const template = program.templates[key];
      if (!template) {
        days.push({ dayNumber, title: "Rest and recover", isRestDay: true, items: [] });
        continue;
      }
      const rounds = template.rounds + (week >= 2 ? 1 : 0);
      let position = 0;
      const fixed = (phase: WorkoutPhase) => (move: { slug: string; seconds: number }) => ({
        position: ++position,
        slug: move.slug,
        phase,
        rounds: 1,
        targetReps: null,
        targetSeconds: move.seconds,
        restSeconds: 0,
      });
      const items = [
        ...template.warmup.map(fixed("warmup")),
        ...template.main.map((move) => ({
          position: ++position,
          slug: move.slug,
          phase: "main" as const,
          rounds,
          targetReps: "reps" in move ? move.reps + 2 * week : null,
          targetSeconds: "seconds" in move ? move.seconds + 5 * week : null,
          restSeconds: template.restSeconds,
        })),
        ...template.cooldown.map(fixed("cooldown")),
      ];
      days.push({
        dayNumber,
        title: `Week ${week + 1}: ${template.title}`,
        isRestDay: false,
        items,
      });
    }
  }
  return days;
}
