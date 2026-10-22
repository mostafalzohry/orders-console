import { describe, expect, it } from "vitest";
import { ordersPath } from "./orders-path";

describe("ordersPath", () => {
  it("sends only sort, direction and limit when nothing is filtered", () => {
    expect(
      ordersPath({ search: "", status: "", sort: "createdAt", dir: "desc" }),
    ).toBe("/api/orders?sort=createdAt&dir=desc&limit=50");
  });

  it("adds search, status and cursor when set", () => {
    const url = new URL(
      ordersPath({
        search: "ann lee",
        status: "paid",
        sort: "totalMinor",
        dir: "asc",
        cursor: "abc",
      }),
      "http://x",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      sort: "totalMinor",
      dir: "asc",
      limit: "50",
      search: "ann lee",
      status: "paid",
      cursor: "abc",
    });
  });
});
