import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { API_PATHS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { apiVoid } from "@/lib/api/client";

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => apiVoid(API_PATHS.logout, { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      router.replace(ROUTES.login);
    },
  });
}
