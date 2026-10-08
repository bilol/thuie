"use client";

import { api } from "@/lib/api/client";
import type {
  Block,
  Comment,
  CursorPage,
  ForumPost,
  InfoPost,
  MyEventRegistration,
  NotificationPreferenceItem,
  RoleStrategy,
  Session,
  UserUpdate,
  UserView,
} from "@/lib/api/types";

/** `GET /me` + all /me-scoped surfaces (BACKEND.md §6.2, §7). */

export const meKeys = {
  all: ["me"] as const,
  profile: () => ["me", "profile"] as const,
  strategy: () => ["me", "strategy"] as const,
  sessions: () => ["me", "sessions"] as const,
  blocks: () => ["me", "blocks"] as const,
  prefs: () => ["me", "notification-preferences"] as const,
  infos: () => ["me", "infos"] as const,
  posts: () => ["me", "posts"] as const,
  comments: () => ["me", "comments"] as const,
  registrations: () => ["me", "event-registrations"] as const,
};

export const meApi = {
  get: () => api.get<UserView>("/me"),
  update: (body: UserUpdate) => api.patch<UserView>("/me", body),
  remove: () => api.del<void>("/me"),
  strategy: () => api.get<RoleStrategy>("/me/role-strategy"),
  sessions: () => api.get<Session[]>("/me/sessions"),
  revokeSession: (id: string) => api.del<void>(`/me/sessions/${id}`),
  revokeAllSessions: () => api.del<void>("/me/sessions"),
  // `GET /me/blocks` returns `{ data: [brief], meta:{total} }`; unwrap the list
  // (mobile `loadBlocks` reads `json['data']`).
  blocks: () => api.get<{ data: Block[] }>("/me/blocks").then((r) => r.data),
  block: (userId: string) => api.post<void>("/me/blocks", { user_id: userId }),
  unblock: (userId: string) => api.del<void>(`/me/blocks/${userId}`),
  prefs: () => api.get<NotificationPreferenceItem[]>("/me/notification-preferences"),
  updatePref: (body: NotificationPreferenceItem) =>
    api.patch<void>("/me/notification-preferences", body),
  infos: (params: { cursor?: string; limit?: number }) =>
    api.get<CursorPage<InfoPost>>("/me/infos", { params }),
  posts: (params: { cursor?: string; limit?: number }) =>
    api.get<CursorPage<ForumPost>>("/me/posts", { params }),
  comments: (params: { cursor?: string; limit?: number }) =>
    api.get<CursorPage<Comment>>("/me/comments", { params }),
  // `GET /me/event-registrations` returns `{ data: [...] }` (mobile `loadMine`
  // reads `json['data']`).
  registrations: (params: { upcoming?: boolean }) =>
    api
      .get<{ data: MyEventRegistration[] }>("/me/event-registrations", { params })
      .then((r) => r.data),
};
