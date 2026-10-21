import { useQuery } from "@tanstack/react-query";
import { API_PATHS, QUERY_KEYS } from "@/constants/api";
import { apiJson } from "@/lib/api/client";
import type { AuthUser } from "@/types/auth";

export function useMe() {
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: ({ signal }) => apiJson<AuthUser>(API_PATHS.me, { signal }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
