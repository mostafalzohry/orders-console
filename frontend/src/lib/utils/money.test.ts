import { describe, expect, it } from "vitest";
import { formatMinorUnits, parseMinorUnits } from "./money";

describe("parseMinorUnits", () => {
  it.each([
    ["12.50", 1250],
    ["12.5", 1250],
    ["12", 1200],
    ["0.07", 7],
    ["0.1", 10],
    ["  3.20 ", 320],
  ])("turns %s into %i minor units", (amount, minor) => {
    expect(parseMinorUnits(amount)).toBe(minor);
  });

  it.each(["", "abc", "1.234", "-5", "1,50", "1e3", ".5"])(
    "returns 0 for %j",
    (amount) => {
      expect(parseMinorUnits(amount)).toBe(0);
    },
  );
});

describe("formatMinorUnits", () => {
  it("shows two decimals and thousands separators", () => {
    expect(formatMinorUnits(125000)).toBe("1,250.00");
    expect(formatMinorUnits(5)).toBe("0.05");
  });
});
