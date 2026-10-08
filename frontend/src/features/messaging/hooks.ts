"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { emitClient, onServer } from "@/lib/realtime/socket";
import type { ChatMessage, CursorPage } from "@/lib/api/types";
import { msgApi, msgKeys } from "./api";

export const useConversations = () =>
  useInfiniteQuery({
    queryKey: msgKeys.conversations(),
    queryFn: ({ pageParam }) => msgApi.conversations(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    refetchInterval: 30_000,
  });

export const useCreateConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: msgApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: msgKeys.conversations() }),
    // The draft composer (/messages/new) renders an inline ApiErrorAlert.
    meta: { silentError: true },
  });
};

/**
 * "Message" is a navigation, not a write. If a DM with this peer already exists
 * in the inbox, open it so history is visible; otherwise route to the draft
 * compose at /messages/new. The conversation row is created only when the first
 * message is sent (see useCreateConversation + the backend's lazy create), so a
 * tap never leaves an empty conversation behind.
 */
export function useStartConversation() {
  const router = useRouter();
  const conversations = useConversations();
  return React.useCallback(
    (peer: { id: string; name?: string | null; avatar_url?: string | null }) => {
      const existing = conversations.data?.pages
        .flatMap((p) => p.data)
        .find((c) => c.kind === "direct" && c.counterpart?.id === peer.id);
      if (existing) {
        router.push(`/messages/${existing.id}`);
        return;
      }
      const q = new URLSearchParams({ peer: peer.id });
      if (peer.name) q.set("name", peer.name);
      if (peer.avatar_url) q.set("avatar", peer.avatar_url);
      router.push(`/messages/new?${q.toString()}`);
    },
    [router, conversations.data],
  );
}

/** Cursor history, newest-first (backend orders id DESC). */
export const useMessagesFeed = (id: string, params: { limit?: number } = {}) =>
  useInfiniteQuery({
    queryKey: msgKeys.messages(id),
    queryFn: ({ pageParam }) => msgApi.messages(id, { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useSendMessage = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; media_id?: string }) => msgApi.send(id, body),
    onSuccess: (message) => {
      qc.setQueryData<CursorPage<ChatMessage>[]>(msgKeys.messages(id), (pages) =>
        pages && pages.length
          ? pages.map((p, i) =>
              i === 0 ? { ...p, data: [message, ...p.data] } : p,
            )
          : pages,
      );
      qc.invalidateQueries({ queryKey: msgKeys.conversations() });
    },
  });
};

/**
 * Join a conversation room and stream live messages/read-receipts into the
 * cache while the screen is mounted.
 */
export function useConversationSocket(id: string) {
  const qc = useQueryClient();
  React.useEffect(() => {
    emitClient("conversation:join", { conversationId: id });
    const offNew = onServer("message:new", (payload: { conversationId: string; message: ChatMessage }) => {
      if (payload.conversationId !== id) return;
      qc.setQueryData<CursorPage<ChatMessage>[]>(msgKeys.messages(id), (pages) =>
        pages && pages.length
          ? pages.map((p, i) => (i === 0 ? { ...p, data: [payload.message, ...p.data] } : p))
          : pages,
      );
      qc.invalidateQueries({ queryKey: msgKeys.conversations() });
    });
    const offRead = onServer("message:read", () =>
      qc.invalidateQueries({ queryKey: msgKeys.conversations() }),
    );
    return () => {
      offNew();
      offRead();
      emitClient("conversation:leave", { conversationId: id });
    };
  }, [id, qc]);
}

export const useMarkConversationRead = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => msgApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: msgKeys.conversations() }),
  });
};

export const useUpdateConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; muted?: boolean; pinned?: boolean }) =>
      msgApi.update(vars.id, { muted: vars.muted, pinned: vars.pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: msgKeys.conversations() }),
  });
};

export const useLeaveConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => msgApi.leave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: msgKeys.conversations() }),
  });
};

/** Soft delete: patch the cached bubble in place (the row stays, content hides). */
export const useDeleteMessage = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => msgApi.deleteMessage(id, messageId),
    onSuccess: (_res, messageId) => {
      qc.setQueryData<CursorPage<ChatMessage>[]>(msgKeys.messages(id), (pages) =>
        pages?.map((p) => ({
          ...p,
          data: p.data.map((m) =>
            m.id === messageId ? { ...m, deleted: true, content: null, media_url: null } : m,
          ),
        })),
      );
      qc.invalidateQueries({ queryKey: msgKeys.conversations() });
    },
  });
};
