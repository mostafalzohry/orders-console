"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/ui/icons";
import { ROUTES } from "@/constants/routes";
import { ApiError } from "@/lib/api/api-error";
import { useMe } from "@/lib/auth/use-me";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const router = useRouter();
  const { error } = useMe();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.replace(ROUTES.login);
    }
  }, [error, router]);

  return (
    <header className="z-20 shrink-0 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="font-semibold tracking-tight">Orders Console</span>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
