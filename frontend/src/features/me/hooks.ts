"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/store";
import type { NotificationPreferenceItem } from "@/lib/api/types";
import { meApi, meKeys } from "./api";

export const useMe = () =>
  useQuery({ queryKey: meKeys.profile(), queryFn: meApi.get });

export const useRoleStrategy = () =>
  useQuery({
    queryKey: meKeys.strategy(),
    queryFn: async () => {
      const s = await meApi.strategy();
      useSession.getState().setStrategy(s);
      return s;
    },
  });

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: meApi.update,
    onSuccess: (user) => {
      useSession.getState().patchUser(user);
      qc.invalidateQueries({ queryKey: meKeys.profile() });
    },
    meta: { silentError: true },
  });
};

export const useSessions = () =>
  useQuery({ queryKey: meKeys.sessions(), queryFn: meApi.sessions });

export const useRevokeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => meApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.sessions() }),
  });
};

export const useRevokeAllSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: meApi.revokeAllSessions,
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.sessions() }),
  });
};

export const useBlocks = () =>
  useQuery({ queryKey: meKeys.blocks(), queryFn: meApi.blocks });

export const useBlock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => meApi.block(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.blocks() }),
  });
};

export const useUnblock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => meApi.unblock(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.blocks() }),
  });
};

export const useNotificationPrefs = () =>
  useQuery({ queryKey: meKeys.prefs(), queryFn: meApi.prefs });

export const useUpdateNotificationPrefs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationPreferenceItem) => meApi.updatePref(body),
    // PATCH returns no body; fold the single toggle into the cached list.
    onSuccess: (_data, body) =>
      qc.setQueryData<NotificationPreferenceItem[]>(meKeys.prefs(), (prev) =>
        prev
          ? prev.map((p) => (p.type === body.type ? { ...p, muted: body.muted } : p))
          : prev,
      ),
    meta: { silentError: true },
  });
};

export const useDeleteAccount = () =>
  useMutation({
    mutationFn: meApi.remove,
    onSettled: () => {
      useSession.getState().clear();
    },
  });

export const useMyInfos = (params: { cursor?: string; limit?: number } = {}) =>
  useQuery({
    queryKey: [...meKeys.infos(), params],
    queryFn: () => meApi.infos(params),
  });

export const useMyPosts = (params: { cursor?: string; limit?: number } = {}) =>
  useQuery({
    queryKey: [...meKeys.posts(), params],
    queryFn: () => meApi.posts(params),
  });

export const useMyComments = (params: { cursor?: string; limit?: number } = {}) =>
  useQuery({
    queryKey: [...meKeys.comments(), params],
    queryFn: () => meApi.comments(params),
  });

export const useMyRegistrations = (params: { upcoming?: boolean } = {}) =>
  useQuery({
    queryKey: [...meKeys.registrations(), params],
    queryFn: () => meApi.registrations(params),
  });
