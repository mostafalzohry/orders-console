import { ApiError } from "@/lib/api/api-error";

export function createOrderErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return error.message;
  }
  if (error instanceof ApiError && error.status === 422) {
    return "These details differ from an earlier attempt. Check the orders list first, then submit again.";
  }
  return "Could not create the order. Please try again.";
}
