import { useQuery } from "@tanstack/react-query";
import { API_PATHS, QUERY_KEYS } from "@/constants/api";
import { apiJson } from "@/lib/api/client";
import type { OrderStats } from "@/types/orders";

export function useOrderStats() {
  return useQuery({
    queryKey: [...QUERY_KEYS.orders, "stats"],
    queryFn: ({ signal }) =>
      apiJson<OrderStats>(API_PATHS.orderStats, { signal }),
    retry: false,
  });
}
