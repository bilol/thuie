"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { InfoCreate } from "@/lib/api/types";
import { infosApi, infosKeys, type InfoListParams } from "./api";

/** Cursor-infinite feed. `getNextPageParam` uses the opaque nextCursor. */
export const useInfosFeed = (params: InfoListParams = {}) =>
  useInfiniteQuery({
    queryKey: infosKeys.list(params),
    queryFn: ({ pageParam }) => infosApi.list({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useInfo = (id: string) =>
  useQuery({
    queryKey: infosKeys.detail(id),
    queryFn: () => infosApi.get(id),
  });

export const useCreateInfo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: infosApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: infosKeys.all }),
    meta: { silentError: true },
  });
};

export const useUpdateInfo = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { body: InfoCreate; version: number }) =>
      infosApi.update(id, vars.body, vars.version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infosKeys.detail(id) });
      qc.invalidateQueries({ queryKey: infosKeys.all });
    },
    meta: { silentError: true },
  });
};

export const useDeleteInfo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => infosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: infosKeys.all }),
  });
};

export const useReportInfo = () =>
  useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      infosApi.report(vars.id, { reason: vars.reason }),
  });

/** Single-page (non-infinite) helper for compact widgets / previews. */
export const useInfosPreview = (params: InfoListParams = {}) =>
  useQuery({
    queryKey: ["infos", "preview", params],
    queryFn: () => infosApi.list({ ...params, limit: params.limit ?? 10 }),
    placeholderData: keepPreviousData,
  });
