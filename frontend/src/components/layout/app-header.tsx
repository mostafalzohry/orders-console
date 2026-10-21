"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROUTES } from "@/constants/routes";
import { ApiError } from "@/lib/api/api-error";
import { useLogout } from "@/lib/auth/use-logout";
import { useMe } from "@/lib/auth/use-me";

export function AppHeader() {
  const router = useRouter();
  const { data: user, error } = useMe();
  const logout = useLogout();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.replace(ROUTES.login);
    }
  }, [error, router]);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
      <span className="font-semibold">Orders Console</span>
      <div className="flex items-center gap-4 text-sm">
        {user && (
          <span className="text-slate-600">
            {user.email} · {user.role}
          </span>
        )}
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-60"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
