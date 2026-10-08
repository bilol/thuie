"use client";

import type { ReactNode } from "react";
import { RequireAdmin } from "@/lib/auth/guards";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { useModerationRealtime } from "@/features/admin";

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  useModerationRealtime();
  return (
    <RequireAdmin>
      <AdminSidebar>{children}</AdminSidebar>
    </RequireAdmin>
  );
}
