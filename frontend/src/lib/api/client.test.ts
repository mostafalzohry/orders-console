import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import { apiJson, apiVoid } from "./client";

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("returns parsed JSON and sends same-origin credentials", async () => {
    const fetchMock = mockFetch(Response.json({ id: "1" }));
    await expect(apiJson("/api/me")).resolves.toEqual({ id: "1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("throws an ApiError with the server message and status", async () => {
    mockFetch(Response.json({ message: "nope" }, { status: 401 }));
    await expect(apiJson("/api/me")).rejects.toMatchObject({
      status: 401,
      message: "nope",
    });
  });

  it("joins validation messages sent as an array", async () => {
    mockFetch(Response.json({ message: ["a", "b"] }, { status: 400 }));
    await expect(apiJson("/api/login")).rejects.toThrow("a, b");
  });

  it("falls back to the status text when the body is not JSON", async () => {
    mockFetch(new Response("boom", { status: 502, statusText: "Bad Gateway" }));
    await expect(apiJson("/api/me")).rejects.toBeInstanceOf(ApiError);
  });

  it("resolves a 204 without reading a body", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(
      apiVoid("/api/logout", { method: "POST" }),
    ).resolves.toBeUndefined();
  });
});
