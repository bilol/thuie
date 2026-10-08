"use client";

import { api } from "@/lib/api/client";
import type { Connection, ConnectionStatus, CursorPage } from "@/lib/api/types";

/** Alumni connections: request / accept / decline / revoke. */

export const connKeys = {
  all: ["connections"] as const,
  list: (box: "requests" | "mine") => ["connections", box] as const,
};

export const connApi = {
  // Cursor feed (`{ data, meta:{nextCursor} }`) — mobile paginates per box.
  list: (box: "requests" | "mine", cursor?: string) =>
    api.get<CursorPage<Connection>>("/connections", { params: { box, cursor } }),
  create: (body: { to_user_id: string; message?: string }) =>
    api.post<Connection>("/connections", body),
  respond: (id: string, status: ConnectionStatus) =>
    api.patch<Connection>(`/connections/${id}`, { status }),
};
