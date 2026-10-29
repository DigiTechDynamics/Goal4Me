import { addDays, daysBetween, parseIsoDate, type IsoDate } from "./dates";
import {
  getRunProgram,
  type QualityWorkout,
  type RunProgramSlug,
  type RunSegment,
  type RunSessionType,
  type SequenceProgram,
  type TemplateWeek,
  type WeeklyProgram,
} from "./running";

/**
 * Turns a programme template plus the runner's own settings into a dated,
 * week-by-week plan. Pure and deterministic: the app regenerates the plan
 * whenever settings change, and only the settings and logged runs are stored.
 */

/** Weekdays, Monday first (0 = Monday … 6 = Sunday). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RunSettings {
  program: RunProgramSlug;
  /** 2–5 runs a week. */
  daysPerWeek: number;
  /** Which weekdays to run on; exactly `daysPerWeek` distinct days. */
  runDays: readonly Weekday[];
  /** The long run (or race) goes on this day; must be one of `runDays`. */
  longRunDay: Weekday;
  startDate: IsoDate;
  /** Optional race day: the plan is fitted so its last run lands on it. */
  raceDate: IsoDate | null;
  units: "km" | "mi";
  /** Optional goal finish time for the programme's distance; sets pace zones. */
  targetSeconds: number | null;
}

export interface RunSession {
  /** 1-based position in the plan; logged runs and gating refer to it. */
  runNumber: number;
  /** Calendar week of the plan (1-based). */
  week: number;
  date: IsoDate;
  type: RunSessionType;
  title: string;
  segments: RunSegment[];
  /** Planned duration; open (race) blocks count their estimate. */
  totalSeconds: number;
}

export interface RunPlan {
  program: RunProgramSlug;
  /** First day of week 1 (may be later than the chosen start to land on race day). */
  startDate: IsoDate;
  weeks: number;
  sessions: RunSession[];
}

export type RunPlanErrorCode = "invalid_days" | "race_before_start" | "race_too_soon";

export class RunPlanError extends Error {
  constructor(
    public readonly code: RunPlanErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RunPlanError";
  }
}

const WARMUP = 5 * 60;
const COOLDOWN = 5 * 60;
const STRIDE = 20;
const STRIDE_RECOVER = 60;
/** A weekly programme may drop up to a third of its early weeks to meet a race date. */
const MAX_SKIP_FRACTION = 1 / 3;
/** At most this many easy "base" weeks are added before a far-off race. */
const MAX_BASE_WEEKS = 6;
/** Safety stop for the sequence loop (a 2-day Couch to 5K takes 14 weeks). */
const MAX_PLAN_WEEKS = 40;

/** Monday-first weekday of a date. */
export const weekdayOf = (date: IsoDate): Weekday =>
  ((parseIsoDate(date).getUTCDay() + 6) % 7) as Weekday;

/** Rounds to the nearest half minute, never below one minute. */
const roundSeconds = (seconds: number) => Math.max(60, Math.round(seconds / 30) * 30);

export function validateRunSettings(settings: RunSettings): void {
  const days = new Set(settings.runDays);
  if (
    settings.daysPerWeek < 2 ||
    settings.daysPerWeek > 5 ||
    days.size !== settings.runDays.length ||
    days.size !== settings.daysPerWeek ||
    [...days].some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    !days.has(settings.longRunDay)
  ) {
    throw new RunPlanError(
      "invalid_days",
      "Pick one different weekday for each run, including your long-run day.",
    );
  }
  parseIsoDate(settings.startDate);
  if (settings.raceDate && daysBetween(settings.startDate, settings.raceDate) < 7) {
    throw new RunPlanError("race_before_start", "Your race needs to be at least a week away.");
  }
}

/** Dates in the 7-day window starting at `from` that fall on the chosen run days. */
function runDatesInWeek(from: IsoDate, runDays: readonly Weekday[]): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(from, i)).filter((d) =>
    runDays.includes(weekdayOf(d)),
  );
}

// --- Segment builders -------------------------------------------------------------

const scale = (seconds: number, intensity: number) => roundSeconds(seconds * intensity);

function intervalSegments(steps: SequenceProgram["sessions"][number]): RunSegment[] {
  return steps.flatMap(([run, walk]): RunSegment[] =>
    walk > 0
      ? [
          { kind: "run", seconds: run },
          { kind: "walk", seconds: walk },
        ]
      : [{ kind: "run", seconds: run }],
  );
}

function qualitySegments(q: QualityWorkout, intensity: number): RunSegment[] {
  switch (q.kind) {
    case "strides":
      return [
        { kind: "easy", seconds: scale(q.easyMin * 60, intensity) },
        ...Array.from({ length: q.reps }, (): RunSegment[] => [
          { kind: "stride", seconds: STRIDE },
          { kind: "recover", seconds: STRIDE_RECOVER },
        ]).flat(),
      ];
    case "intervals":
      // Intensity changes how many repeats, not how long each one is.
      return Array.from(
        { length: Math.max(3, Math.round(q.reps * intensity)) },
        (): RunSegment[] => [
          { kind: "fast", seconds: q.fastSec },
          { kind: "recover", seconds: q.recoverSec },
        ],
      ).flat();
    case "tempo":
      return [{ kind: "tempo", seconds: scale(q.minutes * 60, intensity) }];
  }
}

const QUALITY_TYPE: Record<QualityWorkout["kind"], RunSessionType> = {
  strides: "strides",
  intervals: "intervals",
  tempo: "tempo",
};

const QUALITY_TITLE: Record<QualityWorkout["kind"], string> = {
  strides: "Easy run + strides",
  intervals: "Intervals",
  tempo: "Tempo run",
};

const withWarmup = (main: RunSegment[]): RunSegment[] => [
  { kind: "warmup", seconds: WARMUP },
  ...main,
  { kind: "cooldown", seconds: COOLDOWN },
];

const total = (segments: RunSegment[]) => segments.reduce((sum, s) => sum + s.seconds, 0);

type Draft = Omit<RunSession, "runNumber" | "week" | "date">;

function draft(type: RunSessionType, title: string, segments: RunSegment[]): Draft {
  return { type, title, segments, totalSeconds: total(segments) };
}

function raceDraft(program: WeeklyProgram | SequenceProgram, targetSeconds: number | null): Draft {
  const km = program.goalMeters / 1000;
  const label = km === 5 ? "5K" : km === 10 ? "10K" : km < 30 ? "half marathon" : "marathon";
  return draft("race", `Race day: your ${label}`, [
    { kind: "warmup", seconds: WARMUP + (km > 20 ? 0 : 5 * 60) },
    { kind: "race", seconds: targetSeconds ?? program.typicalSeconds, open: true },
    { kind: "cooldown", seconds: COOLDOWN },
  ]);
}

// --- Per-week session lists ----------------------------------------------------------

/**
 * A weekly programme week for `days` runs: the quality session and the long
 * run always stay; easy runs fill the remaining days (shorter from the 4th).
 */
function weeklyDrafts(
  program: WeeklyProgram,
  week: TemplateWeek,
  days: number,
  intensity: number,
  targetSeconds: number | null,
): { long: Draft; others: Draft[] } {
  const quality = draft(
    QUALITY_TYPE[week.quality.kind],
    QUALITY_TITLE[week.quality.kind],
    withWarmup(qualitySegments(week.quality, intensity)),
  );
  const long =
    week.long === "race"
      ? raceDraft(program, targetSeconds)
      : draft("long", "Long run", [{ kind: "long", seconds: scale(week.long * 60, intensity) }]);
  const easy = (factor: number) =>
    draft("easy", "Easy run", [
      { kind: "easy", seconds: scale(week.easy * 60 * factor, intensity) },
    ]);
  const others = [quality];
  for (let i = 2; i < days; i++) others.push(easy(i === 2 ? 1 : 0.8));
  return { long, others };
}

/**
 * Orders a week's sessions onto its dates: the long run on the long-run day
 * (or the race date), the quality session as far from it as possible, easy
 * runs between.
 */
function placeWeek(
  dates: IsoDate[],
  longDate: IsoDate,
  long: Draft,
  others: Draft[],
): { date: IsoDate; draft: Draft }[] {
  const rest = dates.filter((d) => d !== longDate);
  const distance = (d: IsoDate) => Math.abs(daysBetween(d, longDate));
  // The quality session goes on the free day furthest from the long run.
  const qualityDate = rest.reduce(
    (best, d) => (distance(d) > distance(best) ? d : best),
    rest[0] ?? longDate,
  );
  const [quality, ...easy] = others;
  const placed: { date: IsoDate; draft: Draft }[] = [{ date: longDate, draft: long }];
  if (quality) placed.push({ date: qualityDate, draft: quality });
  const easyDates = rest.filter((d) => d !== qualityDate);
  easy.forEach((e, i) => {
    const date = easyDates[i];
    if (date) placed.push({ date, draft: e });
  });
  return placed.sort((a, b) => a.date.localeCompare(b.date));
}

// --- The plan ----------------------------------------------------------------------------

/**
 * Builds the plan. `intensity` (0.85–1.15) comes from how hard recent runs
 * felt (see nextRunIntensity) and scales run time, never warm-ups.
 */
export function buildRunPlan(settings: RunSettings, intensity = 1): RunPlan {
  validateRunSettings(settings);
  const program = getRunProgram(settings.program);
  const runDays = [...settings.runDays].sort((a, b) => a - b);
  const effort = Math.min(1.15, Math.max(0.85, intensity));

  // 1. The template's weeks, adjusted for the number of days and a race date.
  const templateWeeks =
    program.mode === "weekly"
      ? program.weeks.length
      : Math.ceil(program.sessions.length / Math.min(settings.daysPerWeek, program.perWeek));
  let startDate = settings.startDate;
  let skip = 0;
  let base = 0;
  if (settings.raceDate) {
    // Whole weeks from the chosen start up to and including race day.
    const available = Math.floor((daysBetween(settings.startDate, settings.raceDate) + 1) / 7);
    if (available < templateWeeks) {
      skip = templateWeeks - available;
      if (program.mode === "sequence" || skip > Math.floor(templateWeeks * MAX_SKIP_FRACTION)) {
        throw new RunPlanError(
          "race_too_soon",
          `${program.name} needs about ${templateWeeks} weeks. Pick a later race or an easier programme.`,
        );
      }
    } else if (program.mode === "weekly") {
      base = Math.min(MAX_BASE_WEEKS, available - templateWeeks);
    }
    const planWeeks = templateWeeks - skip + base;
    // Week windows end on race day, so the race is the plan's last run.
    startDate = addDays(settings.raceDate, -planWeeks * 7 + 1);
  }

  const sessions: RunSession[] = [];
  const push = (week: number, date: IsoDate, d: Draft) =>
    sessions.push({ ...d, runNumber: sessions.length + 1, week, date });

  if (program.mode === "sequence") {
    // 2a. Sessions in order; beginners never do more than 3 a week, so
    // extra days become brisk recovery walks instead of extra running.
    const perWeek = Math.min(settings.daysPerWeek, program.perWeek);
    const last = program.sessions.length - 1;
    let next = 0;
    for (let w = 1; next <= last && w <= MAX_PLAN_WEEKS; w++) {
      const weekStart = addDays(startDate, (w - 1) * 7);
      const dates = runDatesInWeek(weekStart, runDays).filter(
        (d) => !settings.raceDate || d <= settings.raceDate,
      );
      const longDate = dates.find((d) => weekdayOf(d) === settings.longRunDay);
      const runDates =
        dates.length > perWeek
          ? // Keep the long-run day and the days spread furthest apart.
            pickSpread(dates, perWeek, longDate)
          : dates;
      for (const date of dates) {
        if (runDates.includes(date) && next <= last) {
          const steps = program.sessions[next] ?? [];
          const isFinal = next === last;
          const runIndex = (next % program.perWeek) + 1;
          const templateWeek = Math.floor(next / program.perWeek) + 1;
          const raceDay = settings.raceDate && isFinal ? settings.raceDate : date;
          push(
            w,
            raceDay,
            isFinal
              ? raceDraft(program, settings.targetSeconds)
              : draft(
                  "run_walk",
                  `Week ${templateWeek} · Run ${runIndex}`,
                  withWarmup(intervalSegments(steps)),
                ),
          );
          next++;
        } else if (!runDates.includes(date) && next <= last) {
          push(
            w,
            date,
            draft("recovery_walk", "Recovery walk", [{ kind: "walk", seconds: 30 * 60 }]),
          );
        }
      }
    }
  } else {
    // 2b. Base weeks (repeat week 1), then the template from `skip`.
    const weeks = [
      ...Array.from({ length: base }).flatMap(() => program.weeks.slice(0, 1)),
      ...program.weeks.slice(skip),
    ];
    weeks.forEach((templateWeek, i) => {
      const w = i + 1;
      const weekStart = addDays(startDate, i * 7);
      const isRaceWeek = templateWeek.long === "race" && i === weeks.length - 1;
      let dates = runDatesInWeek(weekStart, runDays);
      let longDate =
        dates.find((d) => weekdayOf(d) === settings.longRunDay) ?? dates.at(-1) ?? weekStart;
      const raceDate = settings.raceDate;
      if (isRaceWeek && raceDate) {
        // Race day replaces the long-run day; earlier runs that week stay.
        longDate = raceDate;
        dates = [...dates.filter((d) => d < raceDate), raceDate];
      }
      const { long, others } = weeklyDrafts(
        program,
        templateWeek,
        Math.min(settings.daysPerWeek, dates.length),
        effort,
        settings.targetSeconds,
      );
      for (const { date, draft: d } of placeWeek(dates, longDate, long, others)) push(w, date, d);
    });
  }

  const weeks = sessions.at(-1)?.week ?? 0;
  return { program: settings.program, startDate, weeks, sessions };
}

/** Picks `count` dates, always including `keep`, spaced as evenly as possible. */
function pickSpread(dates: IsoDate[], count: number, keep: IsoDate | undefined): IsoDate[] {
  const chosen = new Set<IsoDate>(keep ? [keep] : []);
  while (chosen.size < count) {
    // Greedily add the date furthest from everything chosen so far.
    let best: IsoDate | undefined;
    let bestGap = -1;
    for (const d of dates) {
      if (chosen.has(d)) continue;
      const gap = chosen.size
        ? Math.min(...[...chosen].map((c) => Math.abs(daysBetween(c, d))))
        : 0;
      if (gap > bestGap) {
        best = d;
        bestGap = gap;
      }
    }
    if (!best) break; // fewer dates than requested
    chosen.add(best);
  }
  return dates.filter((d) => chosen.has(d));
}

/** The first session not yet completed (null when the plan is finished). */
export const nextRunSession = (plan: RunPlan, completedRuns: number): RunSession | null =>
  plan.sessions[completedRuns] ?? null;

/**
 * When settings change mid-plan, keep the runner in the same calendar week:
 * the new plan resumes at the first run of the week they were in.
 * Returns the new completed-run count.
 */
export function rebaseProgress(oldPlan: RunPlan, completedRuns: number, newPlan: RunPlan): number {
  const current = oldPlan.sessions[completedRuns];
  if (!current) return newPlan.sessions.length; // finished stays finished
  const index = newPlan.sessions.findIndex((s) => s.week >= current.week);
  return index === -1 ? newPlan.sessions.length : index;
}
