/**
 * Product-wide constants. Every number the spec defines lives here, so a
 * product decision ("raise the minimum age to 18") is a one-line change.
 */

/** Accepted input ranges (metric). The Zod schemas reuse these. */
export const LIMITS = {
  ageYears: { min: 16, max: 80 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
  daysPerWeek: { min: 2, max: 6 },
} as const;

/** Users younger than this need guardian consent and adult BMI cut-offs don't strictly apply. */
export const ADULT_AGE = 18;

/** WHO adult BMI cut-offs. */
export const BMI_BANDS = {
  underweightBelow: 18.5,
  overweightFrom: 25,
  obeseFrom: 30,
} as const;

/** Lowest daily calorie target we will ever recommend, by sex. */
export const MIN_DAILY_KCAL = { female: 1200, male: 1500 } as const;

/** Deficit or surplus applied to TDEE for each goal (fraction of TDEE). */
export const GOAL_ENERGY_ADJUSTMENT = {
  lose_weight: -0.2,
  tone_up: 0,
  build_strength: 0.1,
  get_flexible: 0,
} as const;

/** Weekly body-weight change used for the goal-date projection (fraction of current weight). */
export const WEEKLY_RATE = { loss: 0.0065, gain: 0.0025 } as const;

/** Nutrition targets per kg of body weight. */
export const PROTEIN_G_PER_KG = 1.6;
export const WATER_ML_PER_KG = 33;

/** Workout auto-progression. */
export const INTENSITY = { step: 0.1, min: 0.5, max: 2 } as const;

/** Launch markets and their currencies (ISO 3166-1 alpha-2 → ISO 4217). */
export const LAUNCH_MARKETS = {
  ZW: "USD",
  ZA: "ZAR",
  BW: "BWP",
  ZM: "ZMW",
  MW: "MWK",
  US: "USD",
  GB: "GBP",
  IN: "INR",
} as const;

export type CountryCode = keyof typeof LAUNCH_MARKETS;
export type CurrencyCode = (typeof LAUNCH_MARKETS)[CountryCode];

export const SUPPORTED_CURRENCIES = [
  ...new Set(Object.values(LAUNCH_MARKETS)),
] as readonly CurrencyCode[];
