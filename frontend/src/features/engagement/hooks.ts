"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { FavoriteTargetType } from "@/lib/api/types";
import { engApi, engKeys } from "./api";

export const useFavorites = (type?: FavoriteTargetType) =>
  useInfiniteQuery({
    queryKey: engKeys.favorites(type),
    queryFn: ({ pageParam }) => engApi.favorites(type, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useRemoveFavorite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { target_type: FavoriteTargetType; target_id: string }) =>
      engApi.removeFavorite(vars.target_type, vars.target_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
};

/** Whether the caller has already saved one target — what the icon paints from. */
export const useFavoriteStatus = (type: FavoriteTargetType, id?: string) =>
  useQuery({
    queryKey: engKeys.favoriteStatus(type, id ?? ""),
    queryFn: () => engApi.favoriteStatus(type, id!),
    enabled: !!id,
  });

/**
 * Save / un-save behind a single control. The caller passes the state it rendered,
 * so the button never has to guess which half of the endpoint to hit — `add` is
 * idempotent, which is exactly why an add-only button can never un-save.
 */
export const useToggleFavorite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { target_type: FavoriteTargetType; target_id: string; saved: boolean }) =>
      vars.saved
        ? engApi.removeFavorite(vars.target_type, vars.target_id)
        : engApi.addFavorite({ target_type: vars.target_type, target_id: vars.target_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
};

/** Generic report against any target (BACKEND.md §6.7). */
export const useCreateReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: engApi.report,
    onSuccess: () => qc.invalidateQueries({ queryKey: engKeys.myReports() }),
    // Reported from an inline composer that renders its own ApiErrorAlert.
    meta: { silentError: true },
  });
};

export const useMyReports = (params: { limit?: number } = {}) =>
  useInfiniteQuery({
    queryKey: [...engKeys.myReports(), params],
    queryFn: ({ pageParam }) => engApi.myReports({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
