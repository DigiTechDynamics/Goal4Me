import { describe, expect, it } from "vitest";
import {
  assessBmi,
  bmiCategory,
  bmr,
  buildHealthAssessment,
  calculateBmi,
  calorieTarget,
  healthyWeightRange,
  InputRangeError,
  proteinTargetG,
  tdee,
  waterTargetMl,
} from "../index";

describe("BMI", () => {
  it("calculates weight / height² to 1 decimal", () => {
    expect(calculateBmi(70, 175)).toBe(22.9);
    expect(calculateBmi(95, 170)).toBe(32.9);
  });

  it("maps WHO bands at their exact boundaries", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("healthy");
    expect(bmiCategory(24.9)).toBe("healthy");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obese");
  });

  it("flags that adult cut-offs are only a guide under 18", () => {
    expect(assessBmi({ weightKg: 60, heightCm: 170, age: 17 }).adultCutoffsApply).toBe(false);
    expect(assessBmi({ weightKg: 60, heightCm: 170, age: 18 }).adultCutoffsApply).toBe(true);
  });

  it("returns the healthy weight range for a height", () => {
    expect(healthyWeightRange(175)).toEqual({ minKg: 56.7, maxKg: 76.3 });
  });

  it("rejects out-of-range inputs instead of returning nonsense", () => {
    expect(() => calculateBmi(10, 175)).toThrow(InputRangeError);
    expect(() => calculateBmi(70, 17.5)).toThrow(InputRangeError);
    expect(() => calculateBmi(Number.NaN, 175)).toThrow(InputRangeError);
  });
});

describe("energy", () => {
  const man = { sex: "male", age: 30, heightCm: 180, weightKg: 80 } as const;
  const woman = { sex: "female", age: 25, heightCm: 165, weightKg: 60 } as const;

  it("uses the Mifflin-St Jeor equation", () => {
    expect(bmr(man)).toBe(1780);
    expect(bmr(woman)).toBe(1345);
  });

  it("multiplies BMR by the activity factor", () => {
    expect(tdee(man, "moderate")).toBe(2759);
    expect(tdee(woman, "sedentary")).toBe(1614);
  });

  it("applies a 20% deficit for weight loss, rounded to 10 kcal", () => {
    expect(calorieTarget(2759, "lose_weight", "male")).toEqual({
      kcal: 2210,
      flooredAtMinimum: false,
    });
  });

  it("never goes below the safe minimum", () => {
    expect(calorieTarget(1400, "lose_weight", "female")).toEqual({
      kcal: 1200,
      flooredAtMinimum: true,
    });
    expect(calorieTarget(1700, "lose_weight", "male")).toEqual({
      kcal: 1500,
      flooredAtMinimum: true,
    });
  });

  it("adds a 10% surplus for strength and keeps TDEE otherwise", () => {
    expect(calorieTarget(2000, "build_strength", "male").kcal).toBe(2200);
    expect(calorieTarget(2000, "tone_up", "female").kcal).toBe(2000);
  });
});

describe("nutrition", () => {
  it("targets 1.6 g protein and 33 ml water per kg", () => {
    expect(proteinTargetG(70)).toBe(112);
    expect(waterTargetMl(70)).toBe(2300);
  });
});

describe("buildHealthAssessment", () => {
  const base = {
    sex: "female",
    age: 32,
    heightCm: 165,
    weightKg: 78,
    targetWeightKg: 68,
    goal: "lose_weight",
    activity: "light",
    today: "2026-11-02",
  } as const;

  it("returns everything the result screen needs", () => {
    const result = buildHealthAssessment(base);
    expect(result.bmi).toEqual({ bmi: 28.7, category: "overweight", adultCutoffsApply: true });
    expect(result.bmrKcal).toBe(1490);
    expect(result.tdeeKcal).toBe(2049);
    expect(result.calorieTarget).toEqual({ kcal: 1640, flooredAtMinimum: false });
    expect(result.projection.weeks).toBeGreaterThan(0);
    expect(result.projection.points.at(-1)?.weightKg).toBe(68);
  });

  it("withholds the calorie target from underweight users", () => {
    const result = buildHealthAssessment({
      ...base,
      weightKg: 45,
      targetWeightKg: 50,
      goal: "tone_up",
    });
    expect(result.bmi.category).toBe("underweight");
    expect(result.calorieTarget).toBeNull();
  });
});
