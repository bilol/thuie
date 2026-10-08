"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { useSession, isAdmin } from "@/lib/auth/store";
import { useI18n } from "@/lib/i18n";
import type { RoleStrategy } from "@/lib/api/types";

/**
 * Route guards for the protected (app) tree. `status === "idle"` means the
 * cold-start re-hydration hasn't settled yet (see providers.tsx), so we hold a
 * spinner rather than flash a redirect. BACKEND.md §7 role-strategy gating is
 * enforced here for navigation; the API remains the authority on data.
 */

function Booting() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <span className="text-sm text-muted">{t.shell.loadingSession}</span>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useSession((s) => s.status);

  React.useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status === "idle") return <Booting />;
  if (status !== "authenticated") return null;
  return <>{children}</>;
}

/** Admin-only gate for the /admin console (role admin | admin_super). */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useSession((s) => s.status);
  const { t } = useI18n();

  React.useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status === "idle") return <Booting />;
  if (status !== "authenticated") return null;
  if (!isAdmin()) {
    return (
      <div className="p-8 text-center text-sm text-muted">
        {t.shell.noAdminAccess}
      </div>
    );
  }
  return <>{children}</>;
}

/** Convenience hook: current user or null (after boot). */
export function useCurrentUser() {
  const status = useSession((s) => s.status);
  const user = useSession((s) => s.user);
  return status === "authenticated" ? user : null;
}

/** true while the one-time session bootstrap is still running. */
export function useBooting() {
  return useSession((s) => s.status) === "idle";
}

/** Effective role strategy (BACKEND.md §7), or null before it loads. */
export function useStrategy(): RoleStrategy | null {
  return useSession((s) => s.strategy);
}

/** Role-strategy gate for nav/CTA hiding. The API stays the real authority. */
export function useCan(perm: keyof RoleStrategy): boolean {
  const strategy = useStrategy();
  return strategy ? strategy[perm] === true : true;
}
