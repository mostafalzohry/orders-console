import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminOnly } from "./admin-only";

function renderAdminOnly() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AdminOnly>
        <button type="button">Delete</button>
      </AdminOnly>
    </QueryClientProvider>,
  );
}

function stubMe(response: Promise<Response>) {
  const fetchMock = vi.fn(() => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminOnly", () => {
  it("shows its children to an admin", async () => {
    stubMe(
      Promise.resolve(
        Response.json({ id: "1", email: "a@x.io", role: "admin" }),
      ),
    );
    renderAdminOnly();
    expect(await screen.findByRole("button", { name: "Delete" })).toBeVisible();
  });

  it("hides its children from an agent", async () => {
    const fetchMock = stubMe(
      Promise.resolve(
        Response.json({ id: "1", email: "a@x.io", role: "agent" }),
      ),
    );
    renderAdminOnly();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("hides its children while the role is loading", async () => {
    stubMe(new Promise(() => {}));
    renderAdminOnly();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("hides its children when the profile cannot be loaded", async () => {
    const fetchMock = stubMe(
      Promise.resolve(Response.json({ message: "no" }, { status: 401 })),
    );
    renderAdminOnly();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
