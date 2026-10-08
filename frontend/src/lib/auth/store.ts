import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthResult, RoleStrategy, UserView } from "@/lib/api/types";

/**
 * Session state. The ACCESS token (short JWT, ~15m, BACKEND.md §3) is kept in
 * memory only; the REFRESH token (rotating, revocable) is persisted so a page
 * reload can re-hydrate. NOTE the deliberate web trade-off vs the Flutter
 * §7.8 "secure storage" contract: a browser SPA has no OS keychain, so refresh
 * lives in localStorage. A hardened build would move this to an HttpOnly,
 * SameSite=Strict refresh cookie set by the API — the seam is `readRefresh()`.
 */

interface SessionTokens {
  access: string | null;
  refresh: string | null;
}

interface SessionState {
  status: "idle" | "loading" | "authenticated" | "anonymous";
  user: UserView | null;
  strategy: RoleStrategy | null;
  tokens: SessionTokens;
  /** Apply a login/register/refresh payload (tokens + user). */
  applyAuth: (r: AuthResult) => void;
  /** Partial update after /auth/refresh (tokens + user). */
  setTokens: (access: string, refresh: string) => void;
  patchUser: (patch: Partial<UserView>) => void;
  setStrategy: (s: RoleStrategy | null) => void;
  markReady: (authenticated: boolean) => void;
  clear: () => void;
}

// Access token is intentionally OUTSIDE the persisted slice (memory only).
let memoryAccess: string | null = null;

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      status: "idle",
      user: null,
      strategy: null,
      tokens: { access: null, refresh: null },
      applyAuth: (r) => {
        memoryAccess = r.access_token;
        set({
          user: r.user,
          status: "authenticated",
          tokens: { access: r.access_token, refresh: r.refresh_token },
        });
      },
      setTokens: (access, refresh) => {
        memoryAccess = access;
        set((s) => ({ tokens: { access, refresh } }));
      },
      patchUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
      setStrategy: (strategy) => set({ strategy }),
      markReady: (authenticated) =>
        set({ status: authenticated ? "authenticated" : "anonymous" }),
      clear: () => {
        memoryAccess = null;
        set({ user: null, strategy: null, status: "anonymous", tokens: { access: null, refresh: null } });
      },
    }),
    {
      name: "thuie.session",
      // SSR-safe: no localStorage on the server; hydrate() is called from a
      // client component (see app/providers.tsx). skipHydration avoids reading
      // storage during module init on the server.
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage))),
      skipHydration: true,
      // Persist only the refresh token + last-known user for optimistic boot.
      partialize: (s) => ({ tokens: { access: null, refresh: s.tokens.refresh }, user: s.user }),
    },
  ),
);

/** Read the in-memory access token (falls back to the persisted copy). */
export function readAccess(): string | null {
  return memoryAccess ?? useSession.getState().tokens.access;
}

/** Read the persisted refresh token. The single swap point for a cookie model. */
export function readRefresh(): string | null {
  return useSession.getState().tokens.refresh;
}

export function isAdmin(): boolean {
  const role = useSession.getState().user?.role;
  return role === "admin" || role === "admin_super";
}

/**
 * Super-admin gate. Role-permission editing (`/admin/role-strategies`) is
 * `admin_super`-only on the backend, so plain admins must never reach that
 * screen — mirroring the mobile admin home, which hides the entry from them.
 */
export function isAdminSuper(): boolean {
  return useSession.getState().user?.role === "admin_super";
}
