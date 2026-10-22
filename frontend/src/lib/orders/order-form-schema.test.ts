import { describe, expect, it } from "vitest";
import { orderFormSchema } from "./order-form-schema";

const validItem = { name: "Mouse", quantity: 2, unitPrice: "12.50" };
const valid = {
  customerName: "Ann Lee",
  customerEmail: "ann@example.com",
  items: [validItem],
};

function isValid(overrides: object) {
  return orderFormSchema.safeParse({ ...valid, ...overrides }).success;
}

describe("orderFormSchema", () => {
  it("accepts a valid order", () => {
    expect(isValid({})).toBe(true);
  });

  it("rejects a blank name and a bad email", () => {
    expect(isValid({ customerName: "   " })).toBe(false);
    expect(isValid({ customerEmail: "ann" })).toBe(false);
  });

  it("requires between 1 and 5 items", () => {
    expect(isValid({ items: [] })).toBe(false);
    expect(isValid({ items: Array(5).fill(validItem) })).toBe(true);
    expect(isValid({ items: Array(6).fill(validItem) })).toBe(false);
  });

  it.each([0, 1001, 1.5, Number.NaN])("rejects quantity %s", (quantity) => {
    expect(isValid({ items: [{ ...validItem, quantity }] })).toBe(false);
  });

  it.each(["", "0", "0.00", "abc", "1.234", "100000.01"])(
    "rejects unit price %j",
    (unitPrice) => {
      expect(isValid({ items: [{ ...validItem, unitPrice }] })).toBe(false);
    },
  );

  it("accepts the largest allowed unit price", () => {
    expect(isValid({ items: [{ ...validItem, unitPrice: "100000" }] })).toBe(
      true,
    );
  });
});
