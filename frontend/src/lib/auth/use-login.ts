import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_PATHS, QUERY_KEYS } from "@/constants/api";
import { apiJson } from "@/lib/api/client";
import type { AuthUser } from "@/types/auth";
import type { LoginValues } from "./login-schema";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginValues) =>
      apiJson<AuthUser>(API_PATHS.login, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (user) => queryClient.setQueryData(QUERY_KEYS.me, user),
  });
}
