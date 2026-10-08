"use client";

import { api } from "@/lib/api/client";
import type { ChatMessage, Conversation, CursorPage } from "@/lib/api/types";

/**
 * Messaging. REST backs history; Socket.IO streams increments (message:new /
 * message:read) which we fold into the React Query cache (BACKEND.md §9).
 */

export const msgKeys = {
  conversations: () => ["conversations"] as const,
  messages: (id: string) => ["conversations", id, "messages"] as const,
};

export const msgApi = {
  // Cursor feed (`{ data, meta:{nextCursor} }`) — mobile paginates the inbox.
  conversations: (cursor?: string) =>
    api.get<CursorPage<Conversation>>("/conversations", { params: { cursor } }),
  // DM = `participant_id` (pair_key dedupe; opens the pair's thread). `content`
  // sends a first message atomically — the web draft uses it so a mere "open
  // chat" never persists an empty DM. `participant_ids` creates a group.
  create: (body: { participant_id?: string; participant_ids?: string[]; title?: string; content?: string }) =>
    api.post<Conversation>("/conversations", body),
  messages: (id: string, params: { cursor?: string; limit?: number }) =>
    api.get<CursorPage<ChatMessage>>(`/conversations/${id}/messages`, { params }),
  send: (id: string, body: { content: string; media_id?: string }) =>
    api.post<ChatMessage>(`/conversations/${id}/messages`, body),
  deleteMessage: (id: string, messageId: string) =>
    api.del<{ deleted: boolean; id: string }>(`/conversations/${id}/messages/${messageId}`),
  markRead: (id: string) => api.post<void>(`/conversations/${id}/read`),
  update: (id: string, body: { muted?: boolean; pinned?: boolean }) =>
    api.patch<Conversation>(`/conversations/${id}`, body),
  leave: (id: string) => api.post<void>(`/conversations/${id}/leave`),
  addParticipants: (id: string, user_ids: string[]) =>
    api.post<void>(`/conversations/${id}/participants`, { user_ids }),
  removeParticipant: (id: string, userId: string) =>
    api.del<void>(`/conversations/${id}/participants/${userId}`),
};
