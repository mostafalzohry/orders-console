import { ApiError } from "@/lib/api/api-error";

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Wrong email or password";
  }
  if (error instanceof ApiError && error.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Could not sign in. Please try again.";
}
