import { describe, expect, it } from "vitest";
import { loginSchema } from "./login-schema";

describe("loginSchema", () => {
  it("accepts a valid email and a password", () => {
    expect(
      loginSchema.safeParse({ email: "admin@test.local", password: "x" })
        .success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      loginSchema.safeParse({ email: "admin", password: "x" }).success,
    ).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(
      loginSchema.safeParse({ email: "admin@test.local", password: "" })
        .success,
    ).toBe(false);
  });
});
