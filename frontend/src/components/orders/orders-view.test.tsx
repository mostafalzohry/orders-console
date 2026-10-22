import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrdersView } from "./orders-view";

const DELAY_BY_STATUS: Record<string, number> = {
  paid: 500,
  shipped: 50,
  delivered: 200,
};

function orderRow(label: string) {
  return {
    id: label,
    customerName: label,
    customerEmail: "a@example.com",
    status: "pending",
    items: [{ name: "mouse", quantity: 1, unitPriceMinor: 1000 }],
    totalMinor: 1000,
    createdAt: "2026-10-20T10:00:00.000Z",
  };
}

function page(label: string, nextCursor: string | null = null) {
  return Response.json({ data: [orderRow(label)], nextCursor });
}

function searchParams(input: unknown) {
  return new URL(String(input), "http://localhost").searchParams;
}

function stubFetch(
  handler: (
    params: URLSearchParams,
    init: RequestInit | undefined,
    url: string,
  ) => Promise<Response>,
  role: "admin" | "agent" = "agent",
) {
  const fetchMock = vi.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/me") {
      return Promise.resolve(
        Response.json({ id: "u1", email: "u@test.local", role }),
      );
    }
    return handler(searchParams(input), init, url);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <OrdersView />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("OrdersView", () => {
  it("shows the result of the latest filter when earlier requests finish later", async () => {
    stubFetch((params) => {
      const status = params.get("status") ?? "";
      return new Promise((resolve) =>
        setTimeout(
          () => resolve(page(`${status || "all"} result`)),
          DELAY_BY_STATUS[status] ?? 0,
        ),
      );
    });
    renderView();
    expect(await screen.findByText("all result")).toBeVisible();

    const filter = screen.getByLabelText("Filter by status");
    const user = userEvent.setup();
    await user.selectOptions(filter, "paid");
    await user.selectOptions(filter, "shipped");
    await user.selectOptions(filter, "delivered");

    expect(await screen.findByText("delivered result")).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.getByText("delivered result")).toBeVisible();
    expect(screen.queryByText("paid result")).not.toBeInTheDocument();
    expect(screen.queryByText("shipped result")).not.toBeInTheDocument();
  });

  it("walks forward and back with cursors and resets on a filter change", async () => {
    const fetchMock = stubFetch(async (params) => {
      const cursor = params.get("cursor");
      if (cursor === "c1") {
        return page("second page");
      }
      return page(`first page ${params.get("status") ?? "all"}`, "c1");
    });
    renderView();
    expect(await screen.findByText("first page all")).toBeVisible();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("second page")).toBeVisible();
    expect(screen.getByText("Page 2")).toBeVisible();
    expect(searchParams(fetchMock.mock.lastCall?.[0]).get("cursor")).toBe("c1");

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("first page all")).toBeVisible();
    expect(screen.getByText("Page 1")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("second page")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Filter by status"), "paid");
    expect(await screen.findByText("first page paid")).toBeVisible();
    expect(screen.getByText("Page 1")).toBeVisible();
    expect(searchParams(fetchMock.mock.lastCall?.[0]).has("cursor")).toBe(
      false,
    );
  });

  it("sends one search request after typing stops", async () => {
    const fetchMock = stubFetch(async () => page("row"));
    renderView();
    await screen.findByText("row");
    await userEvent.type(screen.getByLabelText("Search orders"), "smith");

    await waitFor(() =>
      expect(searchParams(fetchMock.mock.lastCall?.[0]).get("search")).toBe(
        "smith",
      ),
    );
    const searches = fetchMock.mock.calls
      .map(([input]) => searchParams(input).get("search"))
      .filter(Boolean);
    expect(searches).toEqual(["smith"]);
  });

  it("sorts by a column header and flips the direction on a second click", async () => {
    const fetchMock = stubFetch(async () => page("row"));
    renderView();
    await screen.findByText("row");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Total/ }));
    await waitFor(() => {
      const params = searchParams(fetchMock.mock.lastCall?.[0]);
      expect([params.get("sort"), params.get("dir")]).toEqual([
        "totalMinor",
        "desc",
      ]);
    });

    await user.click(screen.getByRole("button", { name: /Total/ }));
    await waitFor(() =>
      expect(searchParams(fetchMock.mock.lastCall?.[0]).get("dir")).toBe("asc"),
    );
  });

  it("shows an empty state when nothing matches", async () => {
    stubFetch(async () => Response.json({ data: [], nextCursor: null }));
    renderView();
    expect(await screen.findByText("No orders match.")).toBeVisible();
  });

  it("shows an error with a retry that loads the orders", async () => {
    let attempts = 0;
    stubFetch(async () => {
      attempts += 1;
      return attempts === 1
        ? Response.json({ message: "down" }, { status: 500 })
        : page("recovered");
    });
    renderView();
    expect(await screen.findByText("Could not load orders.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("recovered")).toBeVisible();
  });

  it("shows Clear filters only while a filter is active and resets both", async () => {
    stubFetch(async () => page("row"));
    renderView();
    await screen.findByText("row");
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Filter by status"), "paid");
    await user.type(screen.getByLabelText("Search orders"), "ann");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Filter by status")).toHaveValue("");
    expect(screen.getByLabelText("Search orders")).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  describe("new order dialog", () => {
    it("opens from the button and closes with Cancel", async () => {
      stubFetch(async () => page("row"));
      renderView();
      await screen.findByText("row");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "New order" }));
      expect(screen.getByRole("dialog", { name: "New order" })).toBeVisible();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("keeps what was typed when the dialog is closed and reopened", async () => {
      stubFetch(async () => page("row"));
      renderView();
      await screen.findByText("row");
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "New order" }));
      await user.type(screen.getByLabelText("Customer name"), "Ann Lee");
      await user.click(screen.getByRole("button", { name: "Close dialog" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "New order" }));
      expect(screen.getByLabelText("Customer name")).toHaveValue("Ann Lee");
    });

    it("creates the order, closes the dialog and reloads the list", async () => {
      let created = false;
      const fetchMock = stubFetch(async (_params, init) => {
        if (init?.method === "POST") {
          created = true;
          return Response.json(orderRow("new order"), { status: 201 });
        }
        return page(created ? "after create" : "before create");
      });
      renderView();
      await screen.findByText("before create");
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "New order" }));
      await user.type(screen.getByLabelText("Customer name"), "Ann Lee");
      await user.type(
        screen.getByLabelText("Customer email"),
        "ann@example.com",
      );
      await user.type(screen.getByLabelText("Item 1 name"), "Mouse");
      await user.type(screen.getByLabelText("Item 1 unit price"), "12.50");
      await user.click(screen.getByRole("button", { name: "Create order" }));

      expect(await screen.findByText("after create")).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const posts = fetchMock.mock.calls.filter(
        ([, init]) => init?.method === "POST",
      );
      expect(posts).toHaveLength(1);
    });
  });

  describe("order details dialog", () => {
    const detailedOrder = {
      ...orderRow("ann lee"),
      id: "order-123",
      items: [
        { name: "mouse", quantity: 2, unitPriceMinor: 1250 },
        { name: "cable", quantity: 1, unitPriceMinor: 500 },
      ],
      totalMinor: 3000,
    };

    function stubDetailedOrder() {
      stubFetch(async () =>
        Response.json({ data: [detailedOrder], nextCursor: null }),
      );
    }

    it("does not list the items in the table", async () => {
      stubDetailedOrder();
      renderView();
      await screen.findByText("ann lee");
      expect(
        screen.queryByRole("columnheader", { name: /items/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("mouse")).not.toBeInTheDocument();
    });

    it("shows the full order with its items and totals", async () => {
      stubDetailedOrder();
      renderView();
      await screen.findByText("ann lee");
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Details" }));
      const dialog = screen.getByRole("dialog", { name: "Order details" });
      expect(within(dialog).queryByText("order-123")).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/order id/i)).not.toBeInTheDocument();
      expect(within(dialog).getByText("a@example.com")).toBeVisible();
      expect(
        within(dialog).getByRole("row", { name: /mouse/ }),
      ).toHaveTextContent("mouse212.5025.00");
      expect(
        within(dialog).getByRole("row", { name: /cable/ }),
      ).toHaveTextContent("cable15.005.00");
      expect(within(dialog).getByText("30.00")).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("delete order (admin only)", () => {
    const target = { ...orderRow("ann lee"), id: "order-123" };

    function stubOrders(
      role: "admin" | "agent",
      deleteResponse: () => Response = () =>
        new Response(null, { status: 204 }),
    ) {
      let deleted = false;
      const fetchMock = stubFetch(async (_params, init) => {
        if (init?.method === "DELETE") {
          const response = deleteResponse();
          deleted = response.ok;
          return response;
        }
        return Response.json({
          data: deleted ? [] : [target],
          nextCursor: null,
        });
      }, role);
      return fetchMock;
    }

    const deleteCalls = (fetchMock: ReturnType<typeof stubOrders>) =>
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");

    it("shows no Delete button to an agent", async () => {
      stubOrders("agent");
      renderView();
      await screen.findByText("ann lee");
      await screen.findByRole("button", { name: "Details" });
      expect(
        screen.queryByRole("button", { name: /Delete order for/ }),
      ).not.toBeInTheDocument();
    });

    it("asks for confirmation and sends nothing when cancelled", async () => {
      const fetchMock = stubOrders("admin");
      renderView();
      await screen.findByText("ann lee");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /Delete order for/ }),
      );
      const dialog = screen.getByRole("dialog", { name: "Delete order?" });
      expect(
        within(dialog).getByText("Are you sure you want to delete this order?"),
      ).toBeVisible();
      expect(within(dialog).queryByText("order-123")).not.toBeInTheDocument();
      expect(within(dialog).queryByText("10.00")).not.toBeInTheDocument();
      expect(within(dialog).queryByText(/ann lee/)).not.toBeInTheDocument();
      expect(deleteCalls(fetchMock)).toHaveLength(0);

      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(deleteCalls(fetchMock)).toHaveLength(0);
    });

    it("deletes the order, closes the dialog and reloads the list", async () => {
      const fetchMock = stubOrders("admin");
      renderView();
      await screen.findByText("ann lee");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /Delete order for/ }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Delete",
        }),
      );

      expect(await screen.findByText("No orders match.")).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const calls = deleteCalls(fetchMock);
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe("/api/orders/order-123");
    });

    it("does not show an old error when the dialog is opened again", async () => {
      stubOrders("admin", () =>
        Response.json({ message: "x" }, { status: 404 }),
      );
      renderView();
      await screen.findByText("ann lee");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /Delete order for/ }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Delete",
        }),
      );
      expect(
        await screen.findByText("This order no longer exists."),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(
        await screen.findByRole("button", { name: /Delete order for/ }),
      );
      expect(
        screen.getByRole("dialog", { name: "Delete order?" }),
      ).toBeVisible();
      expect(
        screen.queryByText("This order no longer exists."),
      ).not.toBeInTheDocument();
    });

    it.each([
      [404, "This order no longer exists."],
      [403, "You don't have permission to delete orders."],
      [500, "Could not delete the order. Please try again."],
    ])("keeps the dialog open and explains a %i", async (status, message) => {
      stubOrders("admin", () => Response.json({ message: "x" }, { status }));
      renderView();
      await screen.findByText("ann lee");
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole("button", { name: /Delete order for/ }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Delete",
        }),
      );

      expect(await screen.findByText(message)).toBeVisible();
      expect(
        screen.getByRole("dialog", { name: "Delete order?" }),
      ).toBeVisible();
    });
  });

  describe("row interactions", () => {
    function stubSingleOrder(role: "admin" | "agent") {
      stubFetch(
        async () =>
          Response.json({
            data: [{ ...orderRow("ann lee"), id: "order-123" }],
            nextCursor: null,
          }),
        role,
      );
    }

    it("opens the details only from the Details button, not from the row", async () => {
      stubSingleOrder("agent");
      renderView();
      const user = userEvent.setup();
      await user.click(await screen.findByText("ann lee"));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Details" }));
      expect(
        screen.getByRole("dialog", { name: "Order details" }),
      ).toBeVisible();
    });

    it("opens only the delete dialog when the trash button is clicked", async () => {
      stubSingleOrder("admin");
      renderView();
      await screen.findByText("ann lee");
      await userEvent.click(
        await screen.findByRole("button", { name: /Delete order for/ }),
      );
      expect(
        screen.getByRole("dialog", { name: "Delete order?" }),
      ).toBeVisible();
      expect(
        screen.queryByRole("dialog", { name: "Order details" }),
      ).not.toBeInTheDocument();
    });
  });
});
