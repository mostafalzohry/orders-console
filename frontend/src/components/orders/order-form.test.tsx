import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrderForm } from "./order-form";

const onCreated = vi.fn();
const onCancel = vi.fn();

const createdOrder = {
  id: "1",
  customerName: "ann lee",
  customerEmail: "ann@example.com",
  status: "pending",
  items: [{ name: "mouse", quantity: 2, unitPriceMinor: 1250 }],
  totalMinor: 2500,
  createdAt: "2026-10-20T10:00:00.000Z",
};

function stubFetch(...responses: (() => Promise<Response>)[]) {
  const fetchMock = vi.fn();
  responses.forEach((response) => fetchMock.mockImplementationOnce(response));
  fetchMock.mockImplementation(async () =>
    Response.json(createdOrder, { status: 201 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function keyOf(call: unknown[]) {
  const init = call[1] as { headers: Record<string, string> };
  return init.headers["Idempotency-Key"];
}

function bodyOf(call: unknown[]) {
  return JSON.parse((call[1] as { body: string }).body);
}

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <OrderForm onCreated={onCreated} onCancel={onCancel} />
    </QueryClientProvider>,
  );
}

async function fillValidOrder() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Customer name"), "Ann Lee");
  await user.type(screen.getByLabelText("Customer email"), "ann@example.com");
  await user.type(screen.getByLabelText("Item 1 name"), "Mouse");
  await user.clear(screen.getByLabelText("Item 1 quantity"));
  await user.type(screen.getByLabelText("Item 1 quantity"), "2");
  await user.type(screen.getByLabelText("Item 1 unit price"), "12.50");
  return user;
}

const submitButton = () =>
  screen.getByRole("button", { name: /Create order|Creating/ });

afterEach(() => {
  vi.unstubAllGlobals();
  onCreated.mockReset();
  onCancel.mockReset();
});

describe("OrderForm", () => {
  it("shows the total computed from the items and has no amount field", async () => {
    renderForm();
    expect(screen.queryByLabelText(/^amount/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Total")).toHaveTextContent("0.00");

    const user = await fillValidOrder();
    expect(screen.getByLabelText("Total")).toHaveTextContent("25.00");

    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.clear(screen.getByLabelText("Item 2 quantity"));
    await user.type(screen.getByLabelText("Item 2 quantity"), "3");
    await user.type(screen.getByLabelText("Item 2 unit price"), "0.10");
    expect(screen.getByLabelText("Total")).toHaveTextContent("25.30");
  });

  it("limits the form to five items and at least one", async () => {
    renderForm();
    const user = userEvent.setup();
    expect(
      screen.getByRole("button", { name: "Remove item 1" }),
    ).toBeDisabled();
    for (let count = 1; count < 5; count += 1) {
      await user.click(screen.getByRole("button", { name: "Add item" }));
    }
    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
  });

  it("validates a field only after it has been touched, then on every change", async () => {
    renderForm();
    const user = userEvent.setup();
    expect(
      screen.queryByText("Enter the customer name"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Customer name"));
    expect(
      screen.queryByText("Enter the customer name"),
    ).not.toBeInTheDocument();
    await user.tab();
    expect(await screen.findByText("Enter the customer name")).toBeVisible();
    expect(
      screen.queryByText("Enter a valid email address"),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Customer name"), "Ann");
    await waitFor(() =>
      expect(
        screen.queryByText("Enter the customer name"),
      ).not.toBeInTheDocument(),
    );
  });

  it("validates the email and an item price when each is left", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Customer email"), "ann");
    await user.tab();
    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeVisible();

    await user.click(screen.getByLabelText("Item 1 unit price"));
    await user.tab();
    expect(await screen.findByText("Enter a price like 12.50")).toBeVisible();
    await user.type(screen.getByLabelText("Item 1 unit price"), "12.50");
    await waitFor(() =>
      expect(
        screen.queryByText("Enter a price like 12.50"),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows field errors and sends nothing for an empty form", async () => {
    const fetchMock = stubFetch();
    renderForm();
    await userEvent.click(submitButton());
    expect(await screen.findByText("Enter the customer name")).toBeVisible();
    expect(screen.getByText("Enter a valid email address")).toBeVisible();
    expect(screen.getByText("Enter an item name")).toBeVisible();
    expect(screen.getByText("Enter a price like 12.50")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends whole minor units with an idempotency key and no amount, then reports the order as created", async () => {
    const fetchMock = stubFetch();
    renderForm();
    const user = await fillValidOrder();
    await user.click(submitButton());

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/orders");
    expect(keyOf(call)).toMatch(/^[0-9a-f-]{36}$/);
    expect(bodyOf(call)).toEqual({
      customerName: "Ann Lee",
      customerEmail: "ann@example.com",
      items: [{ name: "Mouse", quantity: 2, unitPriceMinor: 1250 }],
    });
  });

  it("uses one key for every request of a double click", async () => {
    const fetchMock = stubFetch(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(Response.json(createdOrder)), 50),
        ),
    );
    renderForm();
    const user = await fillValidOrder();
    await user.dblClick(submitButton());

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const keys = new Set(fetchMock.mock.calls.map(keyOf));
    expect(keys.size).toBe(1);
  });

  it("reuses the same key when the agent retries after a failure", async () => {
    const fetchMock = stubFetch(async () =>
      Response.json({ message: "down" }, { status: 503 }),
    );
    renderForm();
    const user = await fillValidOrder();
    await user.click(submitButton());
    expect(
      await screen.findByText("Could not create the order. Please try again."),
    ).toBeVisible();

    await user.click(submitButton());
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(keyOf(fetchMock.mock.calls[1])).toBe(keyOf(fetchMock.mock.calls[0]));
  });

  it("clears the form and takes a fresh key after a successful create", async () => {
    const fetchMock = stubFetch();
    renderForm();
    const user = await fillValidOrder();
    await user.click(submitButton());
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Customer name")).toHaveValue("");
    expect(screen.getByLabelText("Total")).toHaveTextContent("0.00");

    await fillValidOrder();
    await user.click(submitButton());
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(2));
    expect(keyOf(fetchMock.mock.calls[1])).not.toBe(
      keyOf(fetchMock.mock.calls[0]),
    );
  });

  it("calls onCancel from the Cancel button", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("takes a new key after the server reports a conflicting repeat", async () => {
    const fetchMock = stubFetch(async () =>
      Response.json({ message: "conflict" }, { status: 422 }),
    );
    renderForm();
    const user = await fillValidOrder();
    await user.click(submitButton());
    expect(
      await screen.findByText(/Check the orders list first/),
    ).toBeVisible();

    await user.click(submitButton());
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(keyOf(fetchMock.mock.calls[1])).not.toBe(
      keyOf(fetchMock.mock.calls[0]),
    );
  });

  it("shows the server's validation message for a 400", async () => {
    stubFetch(async () =>
      Response.json({ message: ["items.0.quantity is bad"] }, { status: 400 }),
    );
    renderForm();
    const user = await fillValidOrder();
    await user.click(submitButton());
    expect(await screen.findByText("items.0.quantity is bad")).toBeVisible();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
