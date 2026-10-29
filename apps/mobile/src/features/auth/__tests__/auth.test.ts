import { describe, expect, it } from "vitest";
import { GENERIC_ERROR, toUserMessage } from "@/lib/errors";
import { newPasswordSchema, signUpSchema } from "../validation";

describe("newPasswordSchema", () => {
  it("accepts matching passwords that meet the sign-up rules", () => {
    expect(
      newPasswordSchema.safeParse({ password: "runner123", confirm: "runner123" }).success,
    ).toBe(true);
  });

  it("flags a mismatch on the confirm field", () => {
    const result = newPasswordSchema.safeParse({ password: "runner123", confirm: "runner124" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirm"]);
  });

  it("uses the same strength rules as sign-up", () => {
    for (const weak of ["short1", "noDigitsHere", "12345678"]) {
      expect(newPasswordSchema.safeParse({ password: weak, confirm: weak }).success).toBe(false);
      expect(signUpSchema.safeParse({ email: "a@b.co", password: weak }).success).toBe(false);
    }
  });
});

describe("auth error messages", () => {
  it.each([
    ["Error sending confirmation email", "couldn't send the email"],
    ["Unsupported provider: provider is not enabled", "isn't available yet"],
    ["invalid request: both auth code and code verifier should be non-empty", "expired"],
    ["otp_expired", "expired"],
    ["New password should be different from the old password.", "haven't used before"],
  ])("explains %s", (raw, expected) => {
    const message = toUserMessage(new Error(raw));
    expect(message).not.toBe(GENERIC_ERROR);
    expect(message).toContain(expected);
  });
});
