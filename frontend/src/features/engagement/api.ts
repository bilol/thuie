"use client";

import { api } from "@/lib/api/client";
import type {
  CursorPage,
  Favorite,
  FavoriteTargetType,
  Report,
  ReportCreateGeneric,
} from "@/lib/api/types";

/** Engagement: favorites and user-filed reports. */

export const engKeys = {
  favorites: (type?: FavoriteTargetType) => ["favorites", type ?? "all"] as const,
  // Deliberately nested under ["favorites"] — invalidating the list also drops
  // every per-target "is this saved" probe.
  favoriteStatus: (type: FavoriteTargetType, id: string) =>
    ["favorites", "status", type, id] as const,
  myReports: () => ["me", "reports"] as const,
};

export const engApi = {
  // Cursor feed (`{ data, meta:{nextCursor} }`) — mobile paginates favorites.
  favorites: (type: FavoriteTargetType | undefined, cursor?: string) =>
    api.get<CursorPage<Favorite>>("/favorites", { params: { type, cursor } }),
  addFavorite: (body: { target_type: FavoriteTargetType; target_id: string }) =>
    api.post<void>("/favorites", body),
  // The server binds `DELETE /favorites` from a body, which axios can't send here,
  // so removals use the documented `/favorites/:type/:id` alias.
  removeFavorite: (target_type: FavoriteTargetType, target_id: string) =>
    api.del<void>(`/favorites/${target_type}/${target_id}`),
  // Single-target existence probe (GET /favorites/status).
  favoriteStatus: (type: FavoriteTargetType, id: string) =>
    api.get<{ favorited: boolean }>("/favorites/status", { params: { type, id } }),

  report: (body: ReportCreateGeneric) => api.post<void>("/reports", body),
  myReports: (params: { cursor?: string; limit?: number }) =>
    api.get<CursorPage<Report>>("/me/reports", { params }),
};
