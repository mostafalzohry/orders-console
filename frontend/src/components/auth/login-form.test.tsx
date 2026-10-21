import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "agent@test.local");
  await user.type(screen.getByLabelText("Password"), "Agent123!");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("LoginForm", () => {
  it("shows field errors and sends nothing when the form is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeVisible();
    expect(screen.getByText("Enter your password")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to the orders page after a successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ id: "1", email: "agent@test.local", role: "agent" }),
        ),
    );
    renderForm();
    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/orders"));
  });

  it("shows the wrong-credentials message for a 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: "x" }, { status: 401 })),
    );
    renderForm();
    await fillAndSubmit();
    expect(await screen.findByText("Wrong email or password")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the rate-limit message for a 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ message: "x" }, { status: 429 })),
    );
    renderForm();
    await fillAndSubmit();
    expect(await screen.findByText(/Too many attempts/)).toBeVisible();
  });
});
