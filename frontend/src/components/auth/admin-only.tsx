"use client";

import type { ReactNode } from "react";
import { useMe } from "@/lib/auth/use-me";

export function AdminOnly({ children }: { children: ReactNode }) {
  const { data: user } = useMe();
  return <>{user?.role === "admin" && children}</>;
}
