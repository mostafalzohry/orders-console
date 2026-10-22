import { ApiError } from "@/lib/api/api-error";

export function deleteOrderErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "This order no longer exists.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "You don't have permission to delete orders.";
  }
  return "Could not delete the order. Please try again.";
}
