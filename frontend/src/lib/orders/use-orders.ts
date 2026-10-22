import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/api";
import { apiJson } from "@/lib/api/client";
import type { OrdersPage, OrdersQuery } from "@/types/orders";
import { ordersPath } from "./orders-path";

export function useOrders(query: OrdersQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.orders, "list", query],
    queryFn: ({ signal }) => apiJson<OrdersPage>(ordersPath(query), { signal }),
    placeholderData: keepPreviousData,
  });
}
