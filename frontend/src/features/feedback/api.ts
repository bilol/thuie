"use client";

import { api } from "@/lib/api/client";
import type { CursorPage, Feedback } from "@/lib/api/types";

/** User feedback (BACKEND.md §6.10) — submit + list own threads. */

export const feedbackKeys = { mine: () => ["me", "feedback"] as const };

export const feedbackApi = {
  submit: (content: string) => api.post<Feedback>("/feedback", { content }),
  // Cursor feed (`{ data, meta:{nextCursor} }`) — mobile paginates feedback.
  mine: (cursor?: string) =>
    api.get<CursorPage<Feedback>>("/me/feedback", { params: { cursor } }),
};
