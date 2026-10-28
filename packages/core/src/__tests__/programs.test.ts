import { describe, expect, it } from "vitest";
import { pickProgram } from "../index";

describe("pickProgram", () => {
  it("gives anyone with knee problems the low-impact programme", () => {
    expect(
      pickProgram({ goal: "lose_weight", fitnessLevel: "advanced", limitations: ["knees"] }).slug,
    ).toBe("wall-pilates");
  });

  it("starts strength newcomers on calisthenics basics", () => {
    expect(
      pickProgram({ goal: "build_strength", fitnessLevel: "beginner", limitations: [] }).slug,
    ).toBe("calisthenics-beginners");
    expect(
      pickProgram({ goal: "build_strength", fitnessLevel: "intermediate", limitations: [] }).slug,
    ).toBe("strength-builder");
  });

  it("maps weight loss, flexibility and toning", () => {
    expect(pickProgram({ goal: "lose_weight", fitnessLevel: "none", limitations: [] }).slug).toBe(
      "fat-burn-home",
    );
    expect(
      pickProgram({ goal: "get_flexible", fitnessLevel: "advanced", limitations: [] }).slug,
    ).toBe("wall-pilates");
    expect(pickProgram({ goal: "tone_up", fitnessLevel: "none", limitations: [] }).slug).toBe(
      "wall-pilates",
    );
    expect(
      pickProgram({ goal: "tone_up", fitnessLevel: "beginner", limitations: ["wrists"] }),
    ).toEqual({
      slug: "calisthenics-beginners",
      name: "Calisthenics for Beginners",
      startingDifficulty: 2,
    });
  });
});
