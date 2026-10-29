import { RUN_LEVELS } from "@goal4me/core";
import { describe, expect, it } from "vitest";
import { FREE_GUIDE_LEVELS, renderRunGuidesSql, RUN_GUIDES } from "../index";

describe("running guides", () => {
  it("has 6 guides per level with unique slugs", () => {
    expect(new Set(RUN_GUIDES.map((g) => g.slug)).size).toBe(RUN_GUIDES.length);
    for (const level of RUN_LEVELS) {
      expect(RUN_GUIDES.filter((g) => g.level === level)).toHaveLength(6);
    }
  });

  it.each(RUN_GUIDES.map((g) => [g.slug, g] as const))(
    "%s is short, readable and actionable",
    (_, g) => {
      const words = g.body.split(/\s+/).length;
      expect(words).toBeGreaterThan(60);
      expect(words).toBeLessThan(220); // about 2 minutes
      expect(g.slug).toMatch(/^[a-z0-9-]+$/);
      expect(g.title.length).toBeLessThanOrEqual(60);
      expect(g.tryThis.length).toBeGreaterThan(20);
      // Only the renderer's formats: paragraphs and "- " bullets, no headings.
      expect(g.body).not.toMatch(/^#/m);
    },
  );

  it("tells beginners when to stop and see a doctor", () => {
    const starter = RUN_GUIDES.filter((g) => g.level === "starter")
      .map((g) => g.body)
      .join(" ");
    expect(starter).toMatch(/doctor/);
    expect(starter).toMatch(/chest pain/);
  });

  it("renders an idempotent seed with only Starter guides free", () => {
    const sql = renderRunGuidesSql();
    expect(sql.match(/insert into public\.run_guides/g)).toHaveLength(RUN_GUIDES.length);
    expect(sql).toContain("on conflict (slug) do update");
    expect(sql.match(/, false, true\)/g)).toHaveLength(
      RUN_GUIDES.filter((g) => FREE_GUIDE_LEVELS.includes(g.level)).length,
    );
  });
});
