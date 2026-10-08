"use client";

import { api } from "@/lib/api/client";
import type {
  CampusEvent,
  CursorPage,
  EventCreate,
  EventDetail,
  EventType,
  Ticket,
} from "@/lib/api/types";

/** Events (cursor feed) + registration / ticket / check-in. */

export const eventsKeys = {
  list: (params: object) => ["events", "list", params] as const,
  detail: (id: string) => ["events", "detail", id] as const,
  ticket: (id: string) => ["events", "ticket", id] as const,
};

export interface EventListParams {
  type?: EventType;
  limit?: number;
}

export const eventsApi = {
  list: (params: EventListParams & { cursor?: string }) =>
    api.get<CursorPage<CampusEvent>>("/events", { params }),
  get: (id: string) => api.get<EventDetail>(`/events/${id}`),
  create: (body: EventCreate) => api.post<CampusEvent>("/events", body),
  update: (id: string, body: EventCreate) =>
    api.patch<CampusEvent>(`/events/${id}`, body),
  register: (id: string) =>
    api.post<{ registered: boolean; event_id: string }>(`/events/${id}/register`),
  cancel: (id: string) =>
    api.del<{ cancelled: boolean }>(`/events/${id}/register`),
  ticket: (id: string) => api.get<Ticket>(`/events/${id}/ticket`),
  checkIn: (id: string, ticket: string) =>
    api.post<{ attended: boolean; user_id: string }>(`/events/${id}/check-in`, { ticket }),
};
