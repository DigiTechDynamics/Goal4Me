import type { FitnessLevel, Goal, Limitation } from "./types";

/**
 * The four launch programmes (spec: Fitness module). Slugs match the
 * `programs.slug` column, so the app can look the programme up after
 * onboarding without hard-coding database ids.
 */
export const PROGRAMS = {
  "calisthenics-beginners": { name: "Calisthenics for Beginners", lowImpact: false },
  "fat-burn-home": { name: "Fat Burn at Home", lowImpact: false },
  "wall-pilates": { name: "Wall Pilates", lowImpact: true },
  "strength-builder": { name: "Strength Builder", lowImpact: false },
} as const;

export type ProgramSlug = keyof typeof PROGRAMS;

export interface ProgramChoice {
  slug: ProgramSlug;
  name: string;
  /** Starting difficulty 1–5, used to pick exercise variations. */
  startingDifficulty: number;
}

const STARTING_DIFFICULTY: Record<FitnessLevel, number> = {
  none: 1,
  beginner: 2,
  intermediate: 3,
  advanced: 4,
};

/**
 * Rule-based programme choice (version 1 uses rules, not AI).
 *  - Knee problems always get the low-impact programme.
 *  - Strength goals need a base: newcomers start with calisthenics basics.
 *  - Weight loss gets the fat-burn programme.
 *  - Flexibility, and toning for complete beginners, get wall pilates.
 */
export function pickProgram(input: {
  goal: Goal;
  fitnessLevel: FitnessLevel;
  limitations: readonly Limitation[];
}): ProgramChoice {
  const { goal, fitnessLevel, limitations } = input;
  const novice = fitnessLevel === "none" || fitnessLevel === "beginner";

  let slug: ProgramSlug;
  if (limitations.includes("knees") || goal === "get_flexible") slug = "wall-pilates";
  else if (goal === "build_strength") slug = novice ? "calisthenics-beginners" : "strength-builder";
  else if (goal === "lose_weight") slug = "fat-burn-home";
  else slug = fitnessLevel === "none" ? "wall-pilates" : "calisthenics-beginners";

  return {
    slug,
    name: PROGRAMS[slug].name,
    startingDifficulty: STARTING_DIFFICULTY[fitnessLevel],
  };
}
