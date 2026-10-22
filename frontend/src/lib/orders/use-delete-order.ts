import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_PATHS, QUERY_KEYS } from "@/constants/api";
import { apiVoid } from "@/lib/api/client";

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiVoid(`${API_PATHS.orders}/${id}`, { method: "DELETE" }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders }),
  });
}
