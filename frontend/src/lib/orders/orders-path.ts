import { API_PATHS } from "@/constants/api";
import { PAGE_SIZE } from "@/constants/orders";
import type { OrdersQuery } from "@/types/orders";

export function ordersPath({
  search,
  status,
  sort,
  dir,
  cursor,
}: OrdersQuery): string {
  const params = new URLSearchParams({ sort, dir, limit: String(PAGE_SIZE) });
  if (search) {
    params.set("search", search);
  }
  if (status) {
    params.set("status", status);
  }
  if (cursor) {
    params.set("cursor", cursor);
  }
  return `${API_PATHS.orders}?${params}`;
}
