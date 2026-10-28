/**
 * Thrown when a calculation receives an input outside its supported range.
 *
 * Inputs are validated at the edges (forms, API) with Zod, but the core
 * functions also guard themselves so that a bug elsewhere can never turn a
 * typo like "17 kg" into a dangerous calorie recommendation.
 */
export class InputRangeError extends RangeError {
  constructor(
    public readonly field: string,
    public readonly value: number,
    public readonly min: number,
    public readonly max: number,
  ) {
    super(`${field} must be between ${min} and ${max}, got ${value}`);
    this.name = "InputRangeError";
  }
}

/** Asserts that `value` is a finite number within [min, max]. */
export function assertInRange(field: string, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new InputRangeError(field, value, min, max);
  }
}
