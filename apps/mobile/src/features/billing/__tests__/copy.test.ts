import { describe, expect, it } from "vitest";
import { autoRenews, planPrice, PLANS_IN_ORDER } from "../copy";

describe("paywall copy", () => {
  it("shows the approved launch prices with a weekly equivalent", () => {
    expect(planPrice("premium_weekly")).toEqual({ total: "$6.99", perWeek: "$6.99" });
    expect(planPrice("premium_quarterly")).toEqual({ total: "$29.99", perWeek: "$2.31" });
    expect(planPrice("premium_yearly")).toEqual({ total: "$59.99", perWeek: "$1.15" });
  });

  it("lists plans shortest first", () => {
    expect(PLANS_IN_ORDER).toEqual(["premium_weekly", "premium_quarterly", "premium_yearly"]);
  });

  it("only store subscriptions renew", () => {
    expect(autoRenews("app_store")).toBe(true);
    expect(autoRenews("play_store")).toBe(true);
    expect(autoRenews("paynow")).toBe(false);
    expect(autoRenews(null)).toBe(false);
  });
});
