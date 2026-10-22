import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "./user-menu";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const me = { id: "user-1", email: "agent@test.local", role: "agent" };

function stubFetch(
  meResponses: (() => Response)[] = [() => Response.json(me)],
) {
  const remaining = [...meResponses];
  const fetchMock = vi.fn<
    (input: unknown, init?: RequestInit) => Promise<Response>
  >(async (input) => {
    if (String(input) === "/api/logout") {
      return new Response(null, { status: 204 });
    }
    return (remaining.length > 1 ? remaining.shift()! : remaining[0])();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderMenu() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <UserMenu />
    </QueryClientProvider>,
  );
}

const trigger = () => screen.getByRole("button", { name: "Account menu" });

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("UserMenu", () => {
  it("starts closed and opens with the profile and log out entries", async () => {
    stubFetch();
    renderMenu();
    expect(
      screen.queryByRole("button", { name: "Profile" }),
    ).not.toBeInTheDocument();

    await userEvent.click(trigger());
    expect(screen.getByRole("button", { name: "Profile" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape and returns the focus to the avatar button", async () => {
    stubFetch();
    renderMenu();
    const user = userEvent.setup();

    await user.click(trigger());
    expect(screen.getByRole("button", { name: "Profile" })).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("button", { name: "Profile" }),
    ).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("closes when the area outside the menu is clicked", async () => {
    stubFetch();
    renderMenu();
    const user = userEvent.setup();
    expect(
      screen.queryByRole("button", { name: "Close menu" }),
    ).not.toBeInTheDocument();

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Close menu" }));

    expect(
      screen.queryByRole("button", { name: "Profile" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close menu" }),
    ).not.toBeInTheDocument();
  });

  it("shows the profile loaded from GET /api/me", async () => {
    const fetchMock = stubFetch();
    renderMenu();
    const user = userEvent.setup();

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Profile" });
    expect(await within(dialog).findByText("agent@test.local")).toBeVisible();
    expect(within(dialog).getByText("agent")).toBeVisible();
    expect(within(dialog).queryByText("user-1")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/user id/i)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/me");
    expect(
      screen.queryByRole("button", { name: "Profile" }),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error with a retry when the profile cannot be loaded", async () => {
    stubFetch([
      () => Response.json({ message: "down" }, { status: 500 }),
      () => Response.json(me),
    ]);
    renderMenu();
    const user = userEvent.setup();

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Profile" });
    expect(
      await within(dialog).findByText("Could not load your profile."),
    ).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Retry" }));
    expect(await within(dialog).findByText("agent@test.local")).toBeVisible();
  });

  it("logs out and goes to the login page", async () => {
    const fetchMock = stubFetch();
    renderMenu();
    const user = userEvent.setup();

    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    const logout = fetchMock.mock.calls.find(
      ([input]) => input === "/api/logout",
    );
    expect(logout?.[1]).toMatchObject({ method: "POST" });
  });
});
