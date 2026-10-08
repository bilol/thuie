"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { feedbackApi, feedbackKeys } from "./api";

export const useMyFeedback = () =>
  useInfiniteQuery({
    queryKey: feedbackKeys.mine(),
    queryFn: ({ pageParam }) => feedbackApi.mine(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useSubmitFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: feedbackApi.submit,
    onSuccess: () => qc.invalidateQueries({ queryKey: feedbackKeys.mine() }),
    meta: { silentError: true },
  });
};
