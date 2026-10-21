import { ApiError } from "./api-error";

async function readMessage(response: Response): Promise<string> {
  try {
    const body: { message?: string | string[] } = await response.json();
    return [body.message ?? response.statusText].flat().join(", ");
  } catch {
    return response.statusText;
  }
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readMessage(response));
  }
  return response;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await request(path, init);
  return response.json();
}

export async function apiVoid(
  path: string,
  init: RequestInit = {},
): Promise<void> {
  await request(path, init);
}
