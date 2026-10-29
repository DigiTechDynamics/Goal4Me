/**
 * Running: from a first walk-run to structured training. A plan is fully
 * determined by its settings, so only the settings and the logged runs are
 * stored; the weeks and sessions are generated here.
 */
import type { WorkoutRating } from "./types";

export type RunnerLevel = "novice" | "beginner" | "intermediate" | "advanced" | "pro";
export type RunGoal = "5k" | "10k" | "half" | "marathon";
export type RunSessionType =
  "walk_run" | "easy" | "long" | "tempo" | "intervals" | "hills" | "race";

export const RUNNER_LEVELS = [
  "novice",
  "beginner",
  "intermediate",
  "advanced",
  "pro",
] as const satisfies readonly RunnerLevel[];
export const RUN_GOALS = ["5k", "10k", "half", "marathon"] as const satisfies readonly RunGoal[];

export const RUN_GOAL_KM: Record<RunGoal, number> = {
  "5k": 5,
  "10k": 10,
  half: 21.0975,
  marathon: 42.195,
};

export const RUN_PLAN_LIMITS = {
  daysPerWeek: { min: 2, max: 6 },
  weeks: { min: 4, max: 24 },
} as const;

/** More days than this adds injury risk faster than it adds fitness. */
export const MAX_DAYS_BY_LEVEL: Record<RunnerLevel, number> = {
  novice: 4,
  beginner: 5,
  intermediate: 6,
  advanced: 6,
  pro: 6,
};

export interface RunPlanSettings {
  level: RunnerLevel;
  goal: RunGoal;
  daysPerWeek: number;
  weeks: number;
}

export interface RunIntervals {
  runSec: number;
  walkSec: number;
  repeats: number;
}

export interface RunSession {
  type: RunSessionType;
  /** Whole session, warm-up and cool-down included. */
  minutes: number;
  /** Walk-run sessions only. */
  intervals?: RunIntervals;
  description: string;
}

export interface RunWeek {
  week: number;
  /** Lighter week so the body absorbs the previous three. */
  isCutback: boolean;
  /** Final weeks before goal day. */
  isTaper: boolean;
  sessions: RunSession[];
  totalMinutes: number;
}

// -----------------------------------------------------------------------------
// Level assessment
// -----------------------------------------------------------------------------

/**
 * Places a runner from two answers anyone can give: how long they can run
 * without stopping, and roughly how far they run in a normal week.
 */
export function assessRunnerLevel(input: {
  continuousMinutes: number;
  weeklyKm: number;
}): RunnerLevel {
  if (input.continuousMinutes < 20) return "novice";
  if (input.weeklyKm < 15) return "beginner";
  if (input.weeklyKm < 30) return "intermediate";
  if (input.weeklyKm < 55) return "advanced";
  return "pro";
}

/** Weeks we suggest for each level and goal; null means build up first. */
const RECOMMENDED_WEEKS: Record<RunnerLevel, Record<RunGoal, number | null>> = {
  novice: { "5k": 9, "10k": 14, half: 20, marathon: null },
  beginner: { "5k": 6, "10k": 10, half: 14, marathon: 20 },
  intermediate: { "5k": 6, "10k": 8, half: 12, marathon: 18 },
  advanced: { "5k": 6, "10k": 8, half: 10, marathon: 16 },
  pro: { "5k": 6, "10k": 6, half: 8, marathon: 14 },
};

export function recommendedWeeks(level: RunnerLevel, goal: RunGoal): number | null {
  return RECOMMENDED_WEEKS[level][goal];
}

/** Friendly warnings for risky combinations. The user may still go ahead. */
export function runPlanWarnings(settings: RunPlanSettings): string[] {
  const warnings: string[] = [];
  const weeks = recommendedWeeks(settings.level, settings.goal);
  if (weeks === null) {
    warnings.push(
      "A marathon is a big step from zero. Start with a 5K or 10K plan and come back once you can run for an hour.",
    );
  } else if (settings.weeks < weeks) {
    warnings.push(
      `We suggest at least ${weeks} weeks for this goal at your level. A shorter plan ramps up faster than is comfortable.`,
    );
  }
  if (settings.daysPerWeek > MAX_DAYS_BY_LEVEL[settings.level]) {
    warnings.push(
      `At your level, ${MAX_DAYS_BY_LEVEL[settings.level]} running days a week is plenty. Use the other days for rest or strength work.`,
    );
  }
  return warnings;
}

// -----------------------------------------------------------------------------
// Plan generation
// -----------------------------------------------------------------------------

/** The novice ladder's last step: 20 minutes of continuous running. */
const LADDER_FINISH: RunIntervals = { runSec: 1200, walkSec: 0, repeats: 1 };

/** Walk-run steps for novices, ending in 20 minutes of continuous running. */
const WALK_RUN_LADDER: readonly RunIntervals[] = [
  { runSec: 60, walkSec: 90, repeats: 8 },
  { runSec: 90, walkSec: 90, repeats: 7 },
  { runSec: 120, walkSec: 90, repeats: 6 },
  { runSec: 180, walkSec: 90, repeats: 5 },
  { runSec: 300, walkSec: 90, repeats: 4 },
  { runSec: 480, walkSec: 60, repeats: 3 },
  { runSec: 720, walkSec: 60, repeats: 2 },
  LADDER_FINISH,
];

/** Typical easy weekly running time when starting each level's plan. */
const START_WEEKLY_MINUTES: Record<RunnerLevel, number> = {
  novice: 75,
  beginner: 90,
  intermediate: 150,
  advanced: 240,
  pro: 330,
};

const PEAK_WEEKLY_MINUTES: Record<RunGoal, number> = {
  "5k": 150,
  "10k": 200,
  half: 270,
  marathon: 360,
};

const PEAK_MULTIPLIER: Record<RunnerLevel, number> = {
  novice: 0.8,
  beginner: 0.9,
  intermediate: 1,
  advanced: 1.15,
  pro: 1.35,
};

const LONG_RUN_CAP_MINUTES: Record<RunGoal, number> = {
  "5k": 50,
  "10k": 75,
  half: 120,
  marathon: 180,
};

/** Rough easy-effort pace for estimating goal-day time (min per km). */
const LEVEL_PACE_MIN_PER_KM: Record<RunnerLevel, number> = {
  novice: 8,
  beginner: 7,
  intermediate: 6,
  advanced: 5.2,
  pro: 4.5,
};

/** About 8% a week: under the classic "10% rule" so beginners stay healthy. */
const WEEKLY_GROWTH = 1.08;
const CUTBACK_FACTOR = 0.8;
const MIN_SESSION_MINUTES = 20;

const roundTo5 = (minutes: number) => Math.max(5, Math.round(minutes / 5) * 5);

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function taperFactors(goal: RunGoal): number[] {
  if (goal === "marathon") return [0.75, 0.5];
  if (goal === "half") return [0.6];
  return [0.7];
}

function walkRunSession(step: RunIntervals): RunSession {
  const continuous = step.walkSec === 0;
  const blockSec = step.repeats * (step.runSec + step.walkSec);
  // 5-minute brisk walk either side.
  const minutes = Math.round(blockSec / 60) + 10;
  const run = describeSeconds(step.runSec);
  return {
    type: "walk_run",
    minutes,
    intervals: step,
    description: continuous
      ? `Walk 5 min, then run ${run} without stopping at an easy pace. Walk 5 min to finish.`
      : `Walk 5 min, then run ${run} and walk ${describeSeconds(step.walkSec)}, ${step.repeats} times. Walk 5 min to finish.`,
  };
}

function qualitySession(type: "tempo" | "intervals" | "hills", minutes: number): RunSession {
  const main = Math.max(10, minutes - 20);
  if (type === "tempo") {
    return {
      type,
      minutes,
      description: `10 min easy, then ${main} min "comfortably hard" (you can speak a few words, not sentences), 10 min easy.`,
    };
  }
  if (type === "intervals") {
    const repeats = clampInt(main / 4, 3, 10);
    return {
      type,
      minutes,
      description: `10 min easy, then ${repeats} × 2 min fast with 2 min slow jogging between, 10 min easy.`,
    };
  }
  const repeats = clampInt(main / 2, 4, 12);
  return {
    type,
    minutes,
    description: `10 min easy to a moderate hill, then ${repeats} × 45 s strong uphill, walking or jogging back down. 10 min easy.`,
  };
}

function easySession(minutes: number): RunSession {
  return {
    type: "easy",
    minutes,
    description: "Easy, conversational pace. If you can't chat, slow down.",
  };
}

function longSession(minutes: number): RunSession {
  return {
    type: "long",
    minutes,
    description:
      "Your long run: slower than easy pace, building endurance. Short walk breaks are fine.",
  };
}

/** Quality workouts per week by level (more for experienced runners with time to recover). */
function qualityCount(level: RunnerLevel, days: number, weekIndex: number, buildWeeks: number) {
  if (level === "novice" || days < 3) return 0;
  if (level === "beginner") return weekIndex >= buildWeeks / 2 ? 1 : 0;
  if (level === "intermediate") return 1;
  return days >= 4 ? 2 : 1;
}

function qualityRotation(goal: RunGoal): ("tempo" | "intervals" | "hills")[] {
  return goal === "5k" || goal === "10k"
    ? ["intervals", "hills", "tempo"]
    : ["tempo", "hills", "intervals"];
}

function buildRunningWeek(
  settings: RunPlanSettings,
  weeklyMinutes: number,
  weekIndex: number,
  buildWeeks: number,
): RunSession[] {
  const days = settings.daysPerWeek;
  const longShare = settings.goal === "half" || settings.goal === "marathon" ? 0.35 : 0.3;
  const longCap = LONG_RUN_CAP_MINUTES[settings.goal] + (settings.level === "pro" ? 30 : 0);
  const longMinutes = days >= 2 ? Math.min(longCap, weeklyMinutes * longShare) : 0;

  const quality = qualityCount(settings.level, days, weekIndex, buildWeeks);
  const qualityMinutes = Math.min(60, Math.max(30, weeklyMinutes * 0.18));
  const rotation = qualityRotation(settings.goal);

  const easyDays = days - 1 - quality;
  const easyMinutes = Math.max(
    MIN_SESSION_MINUTES,
    (weeklyMinutes - longMinutes - quality * qualityMinutes) / Math.max(1, easyDays),
  );

  const sessions: RunSession[] = [];
  for (let q = 0; q < quality; q++) {
    sessions.push(
      qualitySession(
        rotation[(weekIndex + q) % rotation.length] ?? "tempo",
        roundTo5(qualityMinutes),
      ),
    );
  }
  for (let e = 0; e < easyDays; e++) sessions.push(easySession(roundTo5(easyMinutes)));
  // Hard days apart: easy, quality, easy, quality ... long run last.
  const ordered: RunSession[] = [];
  const easy = sessions.filter((s) => s.type === "easy");
  const hard = sessions.filter((s) => s.type !== "easy");
  while (easy.length || hard.length) {
    const nextEasy = easy.shift();
    if (nextEasy) ordered.push(nextEasy);
    const nextHard = hard.shift();
    if (nextHard) ordered.push(nextHard);
  }
  ordered.push(longSession(roundTo5(Math.max(MIN_SESSION_MINUTES, longMinutes))));
  return ordered;
}

/** Estimated goal-day time, for planning only. */
export function estimatedGoalMinutes(level: RunnerLevel, goal: RunGoal): number {
  return roundTo5(RUN_GOAL_KM[goal] * LEVEL_PACE_MIN_PER_KM[level]);
}

function raceSession(settings: RunPlanSettings): RunSession {
  const label = RUN_GOAL_LABEL[settings.goal];
  return {
    type: "race",
    minutes: estimatedGoalMinutes(settings.level, settings.goal),
    description: `Goal day: run your ${label}. Start slower than you feel like, settle in, and finish strong. Join a local race or measure a route.`,
  };
}

export const RUN_GOAL_LABEL: Record<RunGoal, string> = {
  "5k": "5K",
  "10k": "10K",
  half: "half marathon",
  marathon: "marathon",
};

/** Clamps settings into the supported range (the database enforces the same limits). */
export function normaliseRunSettings(settings: RunPlanSettings): RunPlanSettings {
  return {
    ...settings,
    daysPerWeek: clampInt(
      settings.daysPerWeek,
      RUN_PLAN_LIMITS.daysPerWeek.min,
      RUN_PLAN_LIMITS.daysPerWeek.max,
    ),
    weeks: clampInt(settings.weeks, RUN_PLAN_LIMITS.weeks.min, RUN_PLAN_LIMITS.weeks.max),
  };
}

/**
 * Generates the full week-by-week plan.
 *
 * - Novices climb the walk-run ladder first (compressed if the plan is short),
 *   then build continuous running.
 * - Weekly time grows about 8% a week towards a goal-specific peak, with every
 *   fourth week lighter and a taper before goal day.
 * - The long run comes last in the week; hard sessions never sit side by side.
 */
export function generateRunPlan(input: RunPlanSettings): RunWeek[] {
  const settings = normaliseRunSettings(input);
  const { weeks, daysPerWeek, level, goal } = settings;
  const taper = taperFactors(goal).slice(0, Math.max(0, weeks - 2));

  const ladderWeeks =
    level === "novice"
      ? Math.min(WALK_RUN_LADDER.length, Math.max(1, weeks - taper.length - 1))
      : 0;
  const buildWeeks = weeks - ladderWeeks - taper.length;

  const start =
    level === "novice" ? daysPerWeek * 25 : Math.max(START_WEEKLY_MINUTES[level], daysPerWeek * 25);
  const peak = Math.max(start, PEAK_WEEKLY_MINUTES[goal] * PEAK_MULTIPLIER[level]);

  const result: RunWeek[] = [];
  let weekly = start;
  let peakReached = start;

  for (let w = 0; w < weeks; w++) {
    const weekNumber = w + 1;
    let sessions: RunSession[];
    let isCutback = false;
    const isTaper = w >= weeks - taper.length;

    if (w < ladderWeeks) {
      // Spread the ladder across the weeks available.
      const step =
        ladderWeeks === 1
          ? WALK_RUN_LADDER.length - 1
          : Math.round((w * (WALK_RUN_LADDER.length - 1)) / (ladderWeeks - 1));
      sessions = Array.from({ length: daysPerWeek }, () =>
        walkRunSession(WALK_RUN_LADDER[step] ?? LADDER_FINISH),
      );
    } else if (isTaper) {
      const factor = taper[w - (weeks - taper.length)] ?? 1;
      sessions = buildRunningWeek(settings, peakReached * factor, buildWeeks, buildWeeks);
    } else {
      const buildIndex = w - ladderWeeks;
      isCutback = buildIndex > 0 && (buildIndex + 1) % 4 === 0;
      if (buildIndex > 0 && !isCutback) weekly = Math.min(peak, weekly * WEEKLY_GROWTH);
      const minutes = isCutback ? weekly * CUTBACK_FACTOR : weekly;
      peakReached = Math.max(peakReached, weekly);
      sessions = buildRunningWeek(settings, minutes, buildIndex, buildWeeks);
    }

    if (weekNumber === weeks) {
      sessions = [...sessions.slice(0, -1), raceSession(settings)];
    }
    result.push({
      week: weekNumber,
      isCutback,
      isTaper,
      sessions,
      totalMinutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
    });
  }
  return result;
}

// -----------------------------------------------------------------------------
// Progress
// -----------------------------------------------------------------------------

export interface RunLogRef {
  week: number;
  sessionIndex: number;
}

/** The first week that still has an unlogged session (missed weeks wait for you). */
export function currentRunWeek(plan: RunWeek[], logs: readonly RunLogRef[]): number {
  const done = new Set(logs.map((l) => `${l.week}:${l.sessionIndex}`));
  const open = plan.find((w) => w.sessions.some((_, i) => !done.has(`${w.week}:${i}`)));
  return open?.week ?? plan.length;
}

export function isRunPlanComplete(plan: RunWeek[], logs: readonly RunLogRef[]): boolean {
  const done = new Set(logs.map((l) => `${l.week}:${l.sessionIndex}`));
  return plan.every((w) => w.sessions.every((_, i) => done.has(`${w.week}:${i}`)));
}

/**
 * Suggests moving level from recent effort ratings (newest last): three
 * "too easy" in a row means ready for more; two "too hard" means ease off.
 */
export function suggestLevelChange(ratings: readonly WorkoutRating[]): "up" | "down" | null {
  const last3 = ratings.slice(-3);
  if (last3.length === 3 && last3.every((r) => r === "too_easy")) return "up";
  const last2 = ratings.slice(-2);
  if (last2.length === 2 && last2.every((r) => r === "too_hard")) return "down";
  return null;
}

export function nextRunnerLevel(level: RunnerLevel, direction: "up" | "down"): RunnerLevel {
  const index = RUNNER_LEVELS.indexOf(level) + (direction === "up" ? 1 : -1);
  return RUNNER_LEVELS[Math.min(RUNNER_LEVELS.length - 1, Math.max(0, index))] ?? level;
}

// -----------------------------------------------------------------------------
// Pace and race times
// -----------------------------------------------------------------------------

export function paceSecPerKm(distanceKm: number, seconds: number): number | null {
  if (!(distanceKm > 0) || !(seconds > 0)) return null;
  return seconds / distanceKm;
}

/** Clock format: "5:30", or "1:02:05" from an hour up. */
export function formatClock(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

/** Words for instructions: "45 s", "2 min", "1 min 30 s". */
export function describeSeconds(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

/** Pace as "m:ss /km". */
export function formatPace(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} /km`;
}

/**
 * Riegel's formula: predicts a time for another distance from a recent
 * result (T2 = T1 × (D2 / D1)^1.06). Best between 5K and the marathon.
 */
export function predictRaceSeconds(
  knownKm: number,
  knownSeconds: number,
  targetKm: number,
): number {
  return knownSeconds * Math.pow(targetKm / knownKm, 1.06);
}
