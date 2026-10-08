"use client";

import { api } from "@/lib/api/client";
import type {
  AlumniProfile,
  AlumniUpdate,
  CursorPage,
  Department,
  FacultyMember,
  Visibility,
} from "@/lib/api/types";

/** Directory: public departments registry + alumni profiles + faculty. */

export const dirKeys = {
  departments: () => ["departments"] as const,
  alumni: (params: object) => ["alumni", "list", params] as const,
  alumniDetail: (id: string) => ["alumni", "detail", id] as const,
  alumniConnections: (id: string) => ["alumni", "connections", id] as const,
  myAlumni: () => ["me", "alumni-profile"] as const,
  faculty: (params: object) => ["faculty", "list", params] as const,
  facultyDetail: (id: string) => ["faculty", "detail", id] as const,
};

export interface AlumniListParams {
  department?: string;
  skill?: string;
  q?: string;
  graduation_year?: string;
  company?: string;
  program?: string;
  country?: string;
  limit?: number;
}
export interface FacultyListParams {
  department?: string;
  q?: string;
  limit?: number;
}

export const dirApi = {
  // `GET /departments` returns `{ data: [...] }` (no cursor meta); unwrap once
  // here so callers keep a plain array (matches mobile `Page.cursor(...).items`).
  departments: () =>
    api.get<{ data: Department[] }>("/departments").then((r) => r.data),

  alumniList: (params: AlumniListParams & { cursor?: string }) =>
    api.get<CursorPage<AlumniProfile>>("/alumni", { params }),
  alumniGet: (id: string) => api.get<AlumniProfile>(`/alumni/${id}`),
  // `{ data: [...] }` envelope (mobile `connectionsFor` reads `r['data']`).
  alumniConnections: (id: string) =>
    api
      .get<{ data: AlumniProfile[] }>(`/alumni/${id}/connections`)
      .then((r) => r.data),

  myAlumni: () => api.get<AlumniProfile>("/me/alumni-profile"),
  createAlumni: (body: AlumniUpdate) =>
    api.post<AlumniProfile>("/me/alumni-profile", body),
  updateAlumni: (body: AlumniUpdate, version: number) =>
    api.patch<AlumniProfile>("/me/alumni-profile", body, { ifMatch: version }),
  setSkills: (skills: string[]) =>
    api.put<AlumniProfile>("/me/alumni-profile/skills", { skills }),
  requestVisibility: (body: {
    visibility: Visibility;
    note?: string;
  }) => api.post<void>("/me/alumni-profile/visibility-request", body),

  // `GET /faculty` is cursor-only (§6.6) — the same feed shape mobile uses; the
  // web directory pages it with "load more". Admin faculty tables use the offset
  // `/admin/faculty` route instead.
  facultyList: (params: FacultyListParams & { cursor?: string }) =>
    api.get<CursorPage<FacultyMember>>("/faculty", { params }),
  facultyGet: (id: string) => api.get<FacultyMember>(`/faculty/${id}`),
};
