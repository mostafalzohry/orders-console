import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrdersStats } from "./orders-stats";

const STATS = {
  totalsByStatus: {
    pending: 10119,
    paid: 12531,
    shipped: 10012,
    delivered: 12454,
    cancelled: 4884,
  },
  totalOrders: 50000,
  revenueTodayMinor: 12550,
  generatedAt: "2026-10-22T10:00:00.000Z",
};

function renderStats() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: 3, retryDelay: 1 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <OrdersStats />
    </QueryClientProvider>,
  );
}

const region = () => screen.getByRole("region", { name: "Order statistics" });

afterEach(() => vi.unstubAllGlobals());

describe("OrdersStats", () => {
  it("shows placeholders while the request is pending", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    renderStats();
    expect(region()).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Revenue today")).toBeVisible();
    expect(screen.queryByText("50,000")).not.toBeInTheDocument();
  });

  it("shows the totals once they arrive", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(STATS)));
    renderStats();

    expect(await within(region()).findByText("50,000")).toBeVisible();
    expect(within(region()).getByText("125.50")).toBeVisible();
    expect(within(region()).getByText("10,119")).toBeVisible();
    expect(within(region()).getByText("12,531")).toBeVisible();
    expect(within(region()).getByText("4,884")).toBeVisible();
    expect(region()).toHaveAttribute("aria-busy", "false");
  });

  it("shows one Retry on failure, does not retry by itself, and recovers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ message: "down" }, { status: 500 }),
      )
      .mockResolvedValue(Response.json(STATS));
    vi.stubGlobal("fetch", fetchMock);
    renderStats();

    expect(await screen.findByText("Could not load statistics.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await within(region()).findByText("50,000")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText("Could not load statistics."),
    ).not.toBeInTheDocument();
  });

  it("cancels the in-flight request when the page is left", async () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = renderStats();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/api/orders/stats");
    expect(init.signal?.aborted).toBe(false);

    unmount();

    expect(init.signal?.aborted).toBe(true);
  });
});
