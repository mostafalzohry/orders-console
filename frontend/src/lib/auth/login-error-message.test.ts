import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import { loginErrorMessage } from "./login-error-message";

describe("loginErrorMessage", () => {
  it("explains wrong credentials for 401", () => {
    expect(loginErrorMessage(new ApiError(401, "x"))).toBe(
      "Wrong email or password",
    );
  });

  it("explains the rate limit for 429", () => {
    expect(loginErrorMessage(new ApiError(429, "x"))).toMatch(/Too many/);
  });

  it("falls back to a generic message", () => {
    expect(loginErrorMessage(new ApiError(500, "x"))).toMatch(/Could not/);
    expect(loginErrorMessage(new TypeError("network"))).toMatch(/Could not/);
  });
});
