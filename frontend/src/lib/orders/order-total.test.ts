import { describe, expect, it } from "vitest";
import { orderTotalMinor } from "./order-total";

describe("orderTotalMinor", () => {
  it("sums quantity times price across items", () => {
    expect(
      orderTotalMinor([
        { quantity: 2, unitPrice: "12.50" },
        { quantity: 3, unitPrice: "0.10" },
      ]),
    ).toBe(2530);
  });

  it("ignores items that are not filled in yet", () => {
    expect(
      orderTotalMinor([
        { quantity: Number.NaN, unitPrice: "5" },
        { quantity: 2, unitPrice: "abc" },
        {},
      ]),
    ).toBe(0);
  });
});
