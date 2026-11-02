import { describe, expect, it } from "vitest";
import { ACCOUNT_NOTE, APP_NAMES, appConfig, configureApp, currentAppId } from "../config";

describe("app config", () => {
  it("fails loudly when an app forgets to register itself", () => {
    expect(currentAppId()).toBeNull();
    expect(() => appConfig()).toThrow(/configureApp/);
  });

  it("returns the registered app", () => {
    configureApp({
      id: "money",
      name: APP_NAMES.money,
      startHref: "/sign-up",
      startLabel: "Create a free account",
      signUp: { title: "t", subtitle: "s" },
      premiumBenefits: ["b"],
      disclaimer: "d",
    });
    expect(currentAppId()).toBe("money");
    expect(appConfig().name).toBe("Goal4Me Money");
  });

  it("names both apps wherever the shared account is mentioned", () => {
    expect(ACCOUNT_NOTE).toContain("Goal4Me Fit");
    expect(ACCOUNT_NOTE).toContain("Goal4Me Money");
  });
});
