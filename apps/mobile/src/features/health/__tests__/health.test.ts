import { describe, expect, it } from "vitest";
import { noonOf } from "../health.types";

describe("noonOf", () => {
  it("places a calendar day at local noon so time zones never shift it", () => {
    const date = noonOf("2026-10-28");
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 9, 28, 12,
    ]);
  });
});
