import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_PATHS, QUERY_KEYS } from "@/constants/api";
import { IDEMPOTENCY_HEADER } from "@/constants/orders";
import { apiJson } from "@/lib/api/client";
import type { NewOrder, Order } from "@/types/orders";

interface CreateOrderInput {
  order: NewOrder;
  idempotencyKey: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ order, idempotencyKey }: CreateOrderInput) =>
      apiJson<Order>(API_PATHS.orders, {
        method: "POST",
        headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
        body: JSON.stringify(order),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders });
    },
  });
}
