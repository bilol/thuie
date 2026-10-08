"use client";

import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onServer } from "@/lib/realtime/socket";
import { getDict } from "@/lib/i18n";
import { toastSuccess } from "@/lib/feedback";
import { notifApi, notifKeys } from "./api";

export const useNotificationsFeed = (params: { limit?: number } = {}) =>
  useInfiniteQuery({
    queryKey: [...notifKeys.feed(), params],
    queryFn: ({ pageParam }) => notifApi.list({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notifApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.feed() }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notifApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.feed() });
      toastSuccess(getDict().notifications.allMarkedRead);
    },
  });
};

/** Subscribe once (app shell) so new notifications invalidate the feed live. */
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  React.useEffect(
    () => onServer("notification:new", () => qc.invalidateQueries({ queryKey: notifKeys.feed() })),
    [qc],
  );
}
