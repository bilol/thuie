"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { EventCreate } from "@/lib/api/types";
import { getDict } from "@/lib/i18n";
import { toastSuccess } from "@/lib/feedback";
import { meKeys } from "@/features/me";
import { eventsApi, eventsKeys, type EventListParams } from "./api";

export const useEventsFeed = (params: EventListParams = {}) =>
  useInfiniteQuery({
    queryKey: eventsKeys.list(params),
    queryFn: ({ pageParam }) => eventsApi.list({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useEvent = (id: string) =>
  useQuery({ queryKey: eventsKeys.detail(id), queryFn: () => eventsApi.get(id) });

export const useEventTicket = (id: string, enabled = true) =>
  useQuery({
    queryKey: eventsKeys.ticket(id),
    queryFn: () => eventsApi.ticket(id),
    enabled,
  });

/**
 * Register/cancel touch four caches at once: the detail (registered_count),
 * my-registrations (the page derives the button state from it — without this
 * the CTA stays "Register" until a manual refresh), the ticket (re-registering
 * issues a fresh nonce), and the list cards' counts.
 */
const settleRegistration = (qc: ReturnType<typeof useQueryClient>, id: string) => {
  qc.invalidateQueries({ queryKey: eventsKeys.detail(id) });
  qc.invalidateQueries({ queryKey: eventsKeys.ticket(id) });
  qc.invalidateQueries({ queryKey: eventsKeys.list({}) });
  qc.invalidateQueries({ queryKey: meKeys.registrations() });
};

export const useRegisterEvent = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eventsApi.register(id),
    onSuccess: () => {
      settleRegistration(qc, id);
      toastSuccess(getDict().eventDetail.registerSuccess);
    },
  });
};

export const useCancelRegistration = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eventsApi.cancel(id),
    onSuccess: () => {
      settleRegistration(qc, id);
      toastSuccess(getDict().eventDetail.cancelSuccess);
    },
  });
};

export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
    meta: { silentError: true },
  });
};

export const useUpdateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: EventCreate }) =>
      eventsApi.update(vars.id, vars.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
};
