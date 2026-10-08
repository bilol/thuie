"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { AlumniProfile, ConnectionStatus } from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";
import { getDict } from "@/lib/i18n";
import { toastSuccess } from "@/lib/feedback";
import { connApi, connKeys } from "./api";

export const useConnections = (box: "requests" | "mine") =>
  useInfiniteQuery({
    queryKey: connKeys.list(box),
    queryFn: ({ pageParam }) => connApi.list(box, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

/**
 * Connection changes alter the alumni caches' `connection_status` (dirKeys
 * list/detail share the ["alumni"] prefix), so those settle together.
 */
const settleConnections = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: connKeys.all });
  qc.invalidateQueries({ queryKey: ["alumni"] });
};

export const useSendConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: connApi.create,
    onSuccess: () => settleConnections(qc),
    // The alumni detail page renders an inline ApiErrorAlert for this mutation,
    // so suppress the global toast to avoid double feedback there.
    meta: { silentError: true },
  });
};

export const useRespondConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: ConnectionStatus }) =>
      connApi.respond(vars.id, vars.status),
    onSuccess: () => settleConnections(qc),
  });
};

/** Viewer↔profile relation, as the directory endpoints report it. */
export type PairStatus = NonNullable<AlumniProfile["connection_status"]>;

/**
 * One card / one profile page's side of a connection pair: the server's
 * `connection_status` with the action just taken layered on top. The overlay is
 * what keeps a card honest — `settleConnections` only *invalidates* the alumni
 * caches, so until they refetch a stale row would otherwise offer a second send
 * (409 already_requested) or a second withdraw (409 not_connected). Each action
 * resets the other mutation, so send → withdraw → send again reads forward
 * instead of freezing on the older result.
 */
export const useConnectionPair = (remote?: PairStatus | null) => {
  const send = useSendConnection();
  const respond = useRespondConnection();

  /* A row whose cached state was stale still answered with the pair state, so
     reflect it (`already_*`) rather than a red button that reads "didn't send". */
  const reported: PairStatus | null =
    send.isError && send.error instanceof ApiError
      ? send.error.code === "already_connected"
        ? "connected"
        : send.error.code === "already_requested"
          ? "sent"
          : null
      : null;

  let pair: PairStatus | null = remote ?? reported;
  if (respond.isSuccess) {
    pair = respond.variables?.status === "accepted" ? "connected" : null;
  }
  if (send.isSuccess) pair = "sent";

  return {
    pair,
    /** Both are truthy-only-on-failure, so call sites style on them directly. */
    sendError: send.isError ? send.error : null,
    actError: respond.isError ? respond.error : null,
    sending: send.isPending,
    /** Scopes the spinner to the action in flight (accept/decline/withdraw). */
    busyWith: (status: ConnectionStatus) =>
      respond.isPending && respond.variables?.status === status,
    /** `POST /connections` — the optional note is the requester's (§6.9). */
    sendRequest: (vars: { to_user_id: string; message?: string }, onDone?: () => void) =>
      send.mutate(vars, {
        onSuccess: (conn) => {
          // A send that lands on an existing incoming ask auto-accepts (§6.9),
          // so confirm the outcome the server actually returned, not just "sent".
          toastSuccess(
            conn?.status === "accepted"
              ? getDict().connections.nowConnectedToast
              : getDict().connections.requestSentToast,
          );
          respond.reset();
          onDone?.();
        },
      }),
    /** `PATCH … revoked` — withdraw the viewer's own pending ask (§6.9). */
    withdraw: (id: string) =>
      respond.mutate(
        { id, status: "revoked" },
        { onSuccess: () => send.reset() },
      ),
    /** `PATCH … accepted` — answer an incoming ask from the directory. */
    accept: (id: string) =>
      respond.mutate(
        { id, status: "accepted" },
        { onSuccess: () => send.reset() },
      ),
    /** `PATCH … declined` — ignore an incoming ask. */
    decline: (id: string) =>
      respond.mutate(
        { id, status: "declined" },
        { onSuccess: () => send.reset() },
      ),
  };
};
