import { describe, expect, it } from "vitest";
import { LESSON_TRACKS, LESSONS } from "../lessons";
import { renderLessonsSql } from "../sql";

describe("lessons", () => {
  it("has 6 lessons in each of the 5 tracks", () => {
    expect(LESSONS).toHaveLength(30);
    for (const track of LESSON_TRACKS) {
      expect(LESSONS.filter((l) => l.track === track)).toHaveLength(6);
    }
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = LESSONS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("has 3 distinct options per question and a body worth reading", () => {
    for (const lesson of LESSONS) {
      expect(lesson.body.split(/\s+/).length).toBeGreaterThan(60);
      for (const q of lesson.quiz) {
        expect(new Set(q.options).size).toBe(3);
        expect(q.options[q.answer]).toBeTruthy();
      }
    }
  });

  it("renders idempotent SQL with 3 free lessons", () => {
    const sql = renderLessonsSql();
    expect(sql.match(/on conflict \(slug\) do update/g)).toHaveLength(30);
    expect(sql.match(/::jsonb, '[^']*(?:''[^']*)*', false, true\)/g)).toHaveLength(3);
  });
});
