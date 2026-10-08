"use client";

import { api } from "@/lib/api/client";
import type {
  CursorPage,
  InfoCategory,
  InfoCreate,
  InfoPost,
  ReportCreate,
} from "@/lib/api/types";

/** Info board (BACKEND.md §4 cursor feeds, §2 If-Match edits, §6.3). */

export const infosKeys = {
  all: ["infos"] as const,
  list: (params: object) => ["infos", "list", params] as const,
  detail: (id: string) => ["infos", "detail", id] as const,
};

export interface InfoListParams {
  category?: InfoCategory;
  sort?: string;
  limit?: number;
}

export const infosApi = {
  list: (params: InfoListParams & { cursor?: string }) =>
    api.get<CursorPage<InfoPost>>("/infos", { params }),
  get: (id: string) => api.get<InfoPost>(`/infos/${id}`),
  create: (body: InfoCreate) => api.post<InfoPost>("/infos", body),
  update: (id: string, body: InfoCreate, version: number) =>
    api.patch<InfoPost>(`/infos/${id}`, body, { ifMatch: version }),
  remove: (id: string) => api.del<void>(`/infos/${id}`),
  report: (id: string, body: ReportCreate) =>
    api.post<void>(`/infos/${id}/report`, body),
};
