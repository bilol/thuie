"use client";

import { api } from "@/lib/api/client";
import type { CursorPage, Notification } from "@/lib/api/types";

/** Notifications feed (cursor, unread-first) + live `notification:new` stream. */

export const notifKeys = { feed: () => ["notifications"] as const };

export const notifApi = {
  list: (params: { cursor?: string; limit?: number }) =>
    api.get<CursorPage<Notification>>("/notifications", { params }),
  markRead: (id: string) => api.post<void>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>("/notifications/read-all"),
};
