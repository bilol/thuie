import { api } from "@/lib/api/client";
import { useSession, readRefresh } from "@/lib/auth/store";
import type { RoleStrategy, UserView } from "@/lib/api/types";

/**
 * Re-hydrate the session on cold start (Next.js reload loses the in-memory
 * access token). If a refresh token survives, mint a fresh access + pull the
 * effective role strategy; otherwise settle as anonymous. BACKEND.md §3/§6.2.
 */
export async function bootstrapSession(): Promise<void> {
  const { markReady, applyAuth, setStrategy, clear } = useSession.getState();
  if (!readRefresh()) {
    markReady(false);
    return;
  }
  try {
    const refreshed = await api.post<{ access_token: string; refresh_token: string; user: UserView }>(
      "/auth/refresh",
      { refresh_token: readRefresh() },
      { noAuth: true },
    );
    applyAuth({ ...refreshed, token_type: "Bearer", expires_in: 900 });
    const strategy = await api.get<RoleStrategy>("/me/role-strategy");
    setStrategy(strategy);
    markReady(true);
  } catch {
    clear();
    markReady(false);
  }
}
