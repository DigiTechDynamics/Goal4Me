import {
  buildWorkout,
  PROGRAMS,
  type ExerciseInfo,
  type FitnessLevel,
  type Limitation,
} from "@goal4me/core";
import { describe, expect, it } from "vitest";
import {
  EXERCISE_GUIDES,
  EXERCISES,
  expandProgram,
  FALLBACK_SLUGS,
  PROGRAM_SEEDS,
  renderExerciseGuidesSql,
  renderSeedSql,
} from "../index";

const bySlug = new Map(EXERCISES.map((e) => [e.slug, e]));

/** The library in the shape the workout builder uses (slug doubles as id here). */
const library = new Map<string, ExerciseInfo>(
  EXERCISES.map((e) => [
    e.slug,
    {
      id: e.slug,
      slug: e.slug,
      name: e.name,
      difficulty: e.difficulty,
      met: e.met,
      contraindications: e.contraindications,
      easierId: e.easier ?? null,
      videoPath: null,
      formTips: e.formTips,
    },
  ]),
);

describe("exercise library", () => {
  it("has unique, URL-safe slugs", () => {
    expect(bySlug.size).toBe(EXERCISES.length);
    for (const e of EXERCISES) expect(e.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("links every regression to an existing, easier exercise without cycles", () => {
    for (const e of EXERCISES) {
      const seen = new Set<string>();
      let current = e;
      while (current.easier) {
        const easier = bySlug.get(current.easier);
        expect(easier, `${current.slug} -> ${current.easier}`).toBeDefined();
        expect(easier!.difficulty).toBeLessThanOrEqual(current.difficulty);
        expect(seen.has(easier!.slug)).toBe(false);
        seen.add(easier!.slug);
        current = easier!;
      }
    }
  });

  it("uses sensible MET values and has form tips for every move", () => {
    for (const e of EXERCISES) {
      expect(e.met).toBeGreaterThan(1);
      expect(e.met).toBeLessThan(12);
      expect(e.formTips.length).toBeGreaterThan(0);
    }
  });
});

describe("fallbacks", () => {
  it("are safe for everyone", () => {
    for (const slug of FALLBACK_SLUGS) {
      const e = bySlug.get(slug);
      expect(e?.contraindications).toEqual([]);
      expect(e!.difficulty).toBeLessThanOrEqual(2);
    }
  });
});

describe("programmes", () => {
  it("covers every programme the recommendation engine can pick", () => {
    expect(PROGRAM_SEEDS.map((p) => p.slug).sort()).toEqual(Object.keys(PROGRAMS).sort());
  });

  it("expands to 28 days with only known exercises", () => {
    for (const program of PROGRAM_SEEDS) {
      const days = expandProgram(program);
      expect(days).toHaveLength(28);
      expect(days.filter((d) => !d.isRestDay).length).toBeGreaterThanOrEqual(16);
      for (const day of days)
        for (const item of day.items) expect(bySlug.has(item.slug), item.slug).toBe(true);
    }
  });

  it("gets harder each week", () => {
    const days = expandProgram(PROGRAM_SEEDS[0]!);
    const week1 = days[0]!.items.find((i) => i.phase === "main")!;
    const week4 = days[21]!.items.find((i) => i.phase === "main")!;
    expect(week4.targetReps! - week1.targetReps!).toBe(6);
    expect(week4.rounds).toBe(week1.rounds + 1);
  });

  const cases: [Limitation[], FitnessLevel][] = [
    [[], "none"],
    [["knees"], "beginner"],
    [["wrists"], "intermediate"],
    [["back"], "advanced"],
    [["knees", "wrists", "back"], "none"],
  ];

  it.each(cases)(
    "still gives a real workout for limitations %j at level %s",
    (limitations, level) => {
      for (const program of PROGRAM_SEEDS) {
        for (const day of expandProgram(program)
          .filter((d) => !d.isRestDay)
          .slice(0, 7)) {
          const { steps } = buildWorkout({
            items: day.items.map((item) => ({ ...item, exerciseId: item.slug })),
            library,
            limitations,
            level,
            intensityFactor: 1,
            minutesPerSession: 15,
            fallbacks: FALLBACK_SLUGS,
          });
          const mainMoves = steps.filter((s) => s.kind === "exercise" && s.phase === "main");
          expect(mainMoves.length, `${program.slug} day ${day.dayNumber}`).toBeGreaterThanOrEqual(
            4,
          );
          for (const step of steps) {
            if (step.kind !== "exercise") continue;
            expect(
              step.exercise.contraindications.some((c) => limitations.includes(c as Limitation)),
            ).toBe(false);
          }
        }
      }
    },
  );
});

describe("seed SQL", () => {
  it("is idempotent and escapes quotes", () => {
    const sql = renderSeedSql();
    expect(sql).toContain("on conflict (slug) do update");
    expect(sql).toContain("'Child''s pose'");
  });
});

describe("exercise guides", () => {
  it("cover every exercise exactly once", () => {
    const slugs = EXERCISES.map((e) => e.slug).sort();
    expect(Object.keys(EXERCISE_GUIDES).sort()).toEqual(slugs);
  });

  it.each(Object.entries(EXERCISE_GUIDES))("%s is complete and fits the database", (_, guide) => {
    for (const text of [...guide.steps, ...guide.mistakes, guide.breathing, guide.benefit]) {
      expect(text.trim()).toBe(text);
      expect(text.length).toBeGreaterThan(10);
      expect(text.length).toBeLessThanOrEqual(200);
      expect(text).toMatch(/[.!?]$/);
    }
  });

  it("renders an update per exercise", () => {
    const sql = renderExerciseGuidesSql();
    expect(sql.match(/^update public\.exercises set steps/gm)).toHaveLength(EXERCISES.length);
    expect(sql).toContain("don''t hold your breath");
  });
});
