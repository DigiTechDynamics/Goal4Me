/**
 * Running: the novice-to-pro ladder, the level quiz and the programme
 * catalogue. The week-by-week plan itself is generated in runPlan.ts.
 *
 * Every running programme is time-based (minutes, not kilometres), the way
 * most coaching plans for non-elite runners are written: it works without
 * GPS, in any unit system, and adapts naturally to each runner's pace.
 */

export const RUN_LEVELS = ["starter", "builder", "racer", "pro"] as const;
export type RunLevel = (typeof RUN_LEVELS)[number];

/** What each rung of the ladder means and what to master before moving up. */
export const RUN_LEVEL_INFO: Record<
  RunLevel,
  { name: string; range: string; milestones: readonly string[] }
> = {
  starter: {
    name: "Starter",
    range: "First steps to 5K",
    milestones: [
      "Run 30 minutes without stopping",
      "Keep easy runs at a pace where you can talk in sentences",
      "Run three times a week for a month",
    ],
  },
  builder: {
    name: "Builder",
    range: "5K to 10K",
    milestones: [
      "Run 10K at an easy, steady effort",
      "Complete your first interval and tempo sessions",
      "Do a weekly long run of an hour",
    ],
  },
  racer: {
    name: "Racer",
    range: "10K to half marathon",
    milestones: [
      "Run a half marathon (21.1 km)",
      "Hold a 30-minute tempo run",
      "Keep 80% of your running easy",
    ],
  },
  pro: {
    name: "Pro",
    range: "Marathon and faster times",
    milestones: [
      "Finish a marathon (42.2 km)",
      "Plan training around a race with a proper taper",
      "Set personal bests by training with pace zones",
    ],
  },
};

// --- Level quiz ----------------------------------------------------------------

export const LONGEST_RUN_OPTIONS = ["none", "under_10", "10_30", "30_60", "over_60"] as const;
export type LongestRun = (typeof LONGEST_RUN_OPTIONS)[number];

export interface RunnerAnswers {
  /** Longest the runner can run today without stopping, in minutes. */
  longestRun: LongestRun;
  /** Runs in a typical week right now (3 means 3 or more). */
  runsPerWeek: 0 | 1 | 2 | 3;
}

/**
 * Places a runner on the ladder and recommends where to start. Conservative
 * on purpose: starting a level too low costs a few easy weeks, starting too
 * high is how new runners get injured.
 */
export function assessRunnerLevel(answers: RunnerAnswers): {
  level: RunLevel;
  program: RunProgramSlug;
} {
  switch (answers.longestRun) {
    case "none":
    case "under_10":
    case "10_30":
      return { level: "starter", program: "couch-to-5k" };
    case "30_60":
      return { level: "builder", program: "5k-to-10k" };
    case "over_60":
      return answers.runsPerWeek >= 3
        ? { level: "pro", program: "half-to-marathon" }
        : { level: "racer", program: "10k-to-half" };
  }
}

// --- Sessions and segments -------------------------------------------------------

/** One timed block of a run. `open` blocks count up until the runner taps Finish. */
export type RunSegmentKind =
  | "warmup"
  | "run"
  | "walk"
  | "easy"
  | "long"
  | "tempo"
  | "fast"
  | "recover"
  | "stride"
  | "race"
  | "cooldown";

export interface RunSegment {
  kind: RunSegmentKind;
  seconds: number;
  open?: boolean;
}

export type RunSessionType =
  "run_walk" | "recovery_walk" | "easy" | "long" | "tempo" | "intervals" | "strides" | "race";

/** A quality (hard) workout in a weekly-structured programme. */
export type QualityWorkout =
  | { kind: "strides"; easyMin: number; reps: number }
  | { kind: "intervals"; reps: number; fastSec: number; recoverSec: number }
  | { kind: "tempo"; minutes: number };

/** One week of a weekly-structured programme. `long: "race"` ends the plan. */
export interface TemplateWeek {
  quality: QualityWorkout;
  long: number | "race";
  easy: number;
}

/** A Couch-to-5K style session: repeated run/walk pairs, minutes in seconds. */
export type IntervalStep = readonly [run: number, walk: number];

// --- Programmes --------------------------------------------------------------------

interface ProgramBase {
  name: string;
  level: RunLevel;
  /** Distance the programme builds to (and races at the end), metres. */
  goalMeters: number;
  goal: string;
  description: string;
  /** A beginner-friendly finish time, used for the race block when none is set. */
  typicalSeconds: number;
}

/** Sequence programmes: fixed sessions in order, 3 per week at most. */
export interface SequenceProgram extends ProgramBase {
  mode: "sequence";
  perWeek: 3;
  sessions: readonly (readonly IntervalStep[])[];
}

/** Weekly programmes: one quality session, one long run and easy runs each week. */
export interface WeeklyProgram extends ProgramBase {
  mode: "weekly";
  weeks: readonly TemplateWeek[];
}

export type RunProgram = SequenceProgram | WeeklyProgram;

const rep = <T>(times: number, item: T): T[] => Array.from({ length: times }, () => item);
const min = (m: number) => m * 60;

/** Couch to 5K: 9 weeks × 3 runs, from 1-minute runs to 30 minutes non-stop. */
type Session = readonly IntervalStep[];
const COUCH_TO_5K: readonly Session[] = [
  ...rep<Session>(3, rep<IntervalStep>(8, [60, 90])),
  ...rep<Session>(3, rep<IntervalStep>(6, [90, 120])),
  ...rep<Session>(3, [...rep<IntervalStep>(2, [90, 90]), ...rep<IntervalStep>(2, [180, 180])]),
  ...rep<Session>(3, [
    [180, 90],
    [300, 150],
    [180, 90],
    [300, 0],
  ]),
  rep<IntervalStep>(3, [300, 180]),
  [
    [480, 300],
    [480, 0],
  ],
  [[min(20), 0]],
  [
    [300, 180],
    [480, 180],
    [300, 0],
  ],
  [
    [600, 180],
    [600, 0],
  ],
  [[min(25), 0]],
  ...rep<Session>(3, [[min(25), 0]]),
  ...rep<Session>(3, [[min(28), 0]]),
  ...rep<Session>(2, [[min(30), 0]]),
  [[min(30), 0]], // the final run is the 5K itself (see buildRunPlan)
];

const strides = (easyMin: number, reps = 6): QualityWorkout => ({ kind: "strides", easyMin, reps });
const intervals = (reps: number, fastSec: number, recoverSec: number): QualityWorkout => ({
  kind: "intervals",
  reps,
  fastSec,
  recoverSec,
});
const tempo = (minutes: number): QualityWorkout => ({ kind: "tempo", minutes });
const week = (quality: QualityWorkout, long: number | "race", easy: number): TemplateWeek => ({
  quality,
  long,
  easy,
});

export const RUN_PROGRAMS = {
  "couch-to-5k": {
    mode: "sequence",
    name: "Couch to 5K",
    level: "starter",
    goalMeters: 5000,
    goal: "Run 5K (about 30 minutes) without stopping",
    description:
      "Walk-run intervals that grow a little each week, three runs a week for nine weeks.",
    typicalSeconds: min(36),
    perWeek: 3,
    sessions: COUCH_TO_5K,
  },
  "5k-to-10k": {
    mode: "weekly",
    name: "5K to 10K",
    level: "builder",
    goalMeters: 10_000,
    goal: "Run your first 10K",
    description: "Eight weeks that lengthen your long run and add your first speed sessions.",
    typicalSeconds: min(70),
    weeks: [
      week(strides(20, 4), 35, 25),
      week(intervals(5, 120, 120), 40, 25),
      week(tempo(10), 45, 30),
      week(strides(20), 40, 25), // lighter week to absorb the work
      week(intervals(6, 180, 120), 50, 30),
      week(tempo(15), 55, 30),
      week(intervals(5, 240, 120), 60, 35),
      week(strides(20), "race", 20),
    ],
  },
  "5k-speed": {
    mode: "weekly",
    name: "Faster 5K",
    level: "builder",
    goalMeters: 5000,
    goal: "Take time off your 5K",
    description: "Six weeks of short, fast repeats and tempo runs, finishing with a 5K time trial.",
    typicalSeconds: min(30),
    weeks: [
      week(intervals(8, 60, 90), 40, 25),
      week(tempo(12), 45, 25),
      week(intervals(6, 120, 90), 45, 30),
      week(tempo(15), 50, 30),
      week(intervals(5, 180, 120), 50, 30),
      week(strides(20), "race", 20),
    ],
  },
  "10k-to-half": {
    mode: "weekly",
    name: "10K to half marathon",
    level: "racer",
    goalMeters: 21_097,
    goal: "Run a half marathon (21.1 km)",
    description:
      "Twelve weeks: the long run grows to about two hours, with tempo runs for strength.",
    typicalSeconds: min(150),
    weeks: [
      week(strides(25), 60, 30),
      week(tempo(15), 65, 30),
      week(intervals(6, 180, 120), 70, 35),
      week(strides(25), 60, 30),
      week(tempo(20), 80, 35),
      week(intervals(5, 300, 150), 85, 40),
      week(tempo(25), 95, 40),
      week(strides(25), 80, 35),
      week(intervals(6, 300, 120), 105, 40),
      week(tempo(30), 115, 45),
      week(tempo(20), 80, 35), // taper
      week(strides(20), "race", 25),
    ],
  },
  "half-to-marathon": {
    mode: "weekly",
    name: "Half to marathon",
    level: "pro",
    goalMeters: 42_195,
    goal: "Finish a marathon (42.2 km)",
    description:
      "Sixteen weeks building the long run to three hours, then a three-week taper into race day.",
    typicalSeconds: min(300),
    weeks: [
      week(strides(30), 90, 40),
      week(tempo(20), 100, 40),
      week(intervals(6, 300, 120), 110, 45),
      week(strides(30), 90, 40),
      week(tempo(25), 120, 45),
      week(intervals(5, 480, 180), 130, 45),
      week(tempo(30), 140, 50),
      week(strides(30), 110, 40),
      week(intervals(6, 480, 150), 150, 50),
      week(tempo(35), 160, 50),
      week(intervals(4, 900, 180), 170, 50),
      week(strides(30), 130, 45),
      week(tempo(40), 180, 50),
      week(tempo(30), 130, 45), // taper starts
      week(intervals(5, 300, 120), 90, 40),
      week(strides(20), "race", 30),
    ],
  },
} as const satisfies Record<string, RunProgram>;

export type RunProgramSlug = keyof typeof RUN_PROGRAMS;
export const RUN_PROGRAM_SLUGS = Object.keys(RUN_PROGRAMS) as RunProgramSlug[];

export const getRunProgram = (slug: RunProgramSlug): RunProgram => RUN_PROGRAMS[slug];

/** Free users can do the first few runs of every programme (spec: Monetisation). */
export const FREE_RUNS_PER_PROGRAM = 3;

/** The effort a runner reports after a run; tunes the next runs like workout ratings. */
export const RUN_EFFORTS = ["easy", "just_right", "hard"] as const;
export type RunEffort = (typeof RUN_EFFORTS)[number];

export const RUN_INTENSITY = { min: 0.85, max: 1.15, step: 0.05 } as const;

/**
 * Next intensity after a run. Like strength workouts, effort nudges the
 * plan in small steps and never by more than 15% either way.
 */
export function nextRunIntensity(current: number, effort: RunEffort): number {
  const delta =
    effort === "easy" ? RUN_INTENSITY.step : effort === "hard" ? -RUN_INTENSITY.step : 0;
  const next = Math.round((current + delta) * 100) / 100;
  return Math.min(RUN_INTENSITY.max, Math.max(RUN_INTENSITY.min, next));
}

/**
 * Compendium-of-Physical-Activities style MET values per segment, for the
 * calorie estimate (kcal = MET × kg × hours, see estimateKcal).
 */
export const RUN_SEGMENT_MET: Record<RunSegmentKind, number> = {
  warmup: 3.5,
  cooldown: 3,
  walk: 3.5,
  recover: 5,
  run: 7,
  easy: 8,
  long: 8,
  stride: 10,
  tempo: 10,
  fast: 11,
  race: 10,
};

/** Time-weighted MET of a run's segments. */
export function averageRunMet(segments: readonly RunSegment[]): number {
  const total = segments.reduce((sum, s) => sum + s.seconds, 0);
  if (total === 0) return RUN_SEGMENT_MET.easy;
  return segments.reduce((sum, s) => sum + RUN_SEGMENT_MET[s.kind] * s.seconds, 0) / total;
}
