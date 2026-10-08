"use client";

import { api } from "@/lib/api/client";
import type {
  CursorPage,
  MentorCreate,
  MentorProfile,
  MentorshipApplication,
} from "@/lib/api/types";

/** Mentorship: browse mentors, become a mentor, apply / respond / withdraw. */

export const mentorKeys = {
  mentors: (area?: string) => ["mentorship", "mentors", area ?? "all"] as const,
  applications: () => ["mentorship", "applications"] as const,
};

export const mentorApi = {
  // Cursor feeds (`{ data, meta:{nextCursor} }`) — mobile paginates both.
  mentors: (area?: string, cursor?: string) =>
    api.get<CursorPage<MentorProfile>>("/mentors", { params: { area, cursor } }),
  becomeMentor: (body: MentorCreate) =>
    api.post<MentorProfile>("/me/mentor-profile", body),
  /** `role=outgoing` → applications I sent; `role=incoming` → mentor inbox. */
  applications: (role: "incoming" | "outgoing", cursor?: string) =>
    api.get<CursorPage<MentorshipApplication>>("/mentorship/applications", {
      params: { role, cursor },
    }),
  apply: (body: { mentor_user_id: string; message: string }) =>
    api.post<MentorshipApplication>("/mentorship/applications", body),
  respond: (id: string, status: "accepted" | "rejected") =>
    api.patch<MentorshipApplication>(`/mentorship/applications/${id}`, { status }),
  withdraw: (id: string) => api.del<void>(`/mentorship/applications/${id}`),
};
