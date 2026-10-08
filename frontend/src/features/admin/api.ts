"use client";

import { api } from "@/lib/api/client";
import type {
  AdminFeedback,
  FacultyMember,
  FeedbackStatus,
  Keyword,
  KeywordCreate,
  ModerationAction,
  ModerationTargetType,
  OffsetPage,
  OperationLog,
  Report,
  ReportStatus,
  ReviewQueueItem,
  Role,
  RoleStrategy,
  Stats,
  UserStatus,
  UserView,
} from "@/lib/api/types";

/** Admin / moderation console (BACKEND.md §6.8). */

export const adminKeys = {
  review: (params: object) => ["admin", "review", params] as const,
  reports: (params: object) => ["admin", "reports", params] as const,
  feedback: (params: object) => ["admin", "feedback", params] as const,
  keywords: () => ["admin", "keywords"] as const,
  users: (params: object) => ["admin", "users", params] as const,
  faculty: (params: object) => ["admin", "faculty", params] as const,
  strategies: () => ["admin", "role-strategies"] as const,
  logs: (params: object) => ["admin", "operation-logs", params] as const,
  stats: () => ["admin", "stats"] as const,
  history: (type: string, id: string) => ["admin", "history", type, id] as const,
};

/** `POST`/`PATCH /admin/faculty` payload (BACKEND.md §6.6 admin-maintained directory). */
export interface FacultyUpsert {
  name: string;
  department?: string;
  title?: string;
  research_area?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatar_media_id?: string;
  avatar_url?: string;
  address?: string;
  homepage?: string;
}

/** `PUT /admin/users/:id` payload — admin edit of a user's profile details (§6.17). */
export interface AdminUserUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  student_id?: string | null;
  department_id?: string | null;
  program?: string | null;
  nationality?: string | null;
  grade_year?: string | null;
  graduation_year?: string | null;
  role?: Role;
}

/** Sortable columns for the admin users table (§6.17) — matches the backend whitelist. */
export type UserSortField = "name" | "program" | "department" | "role" | "status" | "created_at";

/** Sortable columns for the admin faculty table (§6.6) — matches the backend `@IsIn`. */
export type FacultySortField = "name" | "title";

/** `POST /admin/users` payload — admin-provisioned account (§6.17). Unlike the
 *  edit payload, `name`/`role`/`password` are required: the admin sets a
 *  temporary password because provisioning skips the signup OTP. */
export interface AdminUserCreate {
  name: string;
  role: Role;
  password: string;
  student_id?: string | null;
  email?: string | null;
  phone?: string | null;
  department_id?: string | null;
  program?: string | null;
  nationality?: string | null;
  grade_year?: string | null;
  graduation_year?: string | null;
}

export const adminApi = {
  review: (params: { page?: number; limit?: number; type?: ModerationTargetType }) =>
    api.get<OffsetPage<ReviewQueueItem>>("/admin/review", { params }),
  approve: (type: ModerationTargetType, id: string) =>
    api.post<void>(`/admin/review/${type}/${id}/approve`),
  reject: (type: ModerationTargetType, id: string, reason: string) =>
    api.post<void>(`/admin/review/${type}/${id}/reject`, { reason }),
  takedown: (body: {
    target_type: ModerationTargetType;
    target_id: string;
    reason: string;
  }) => api.post<void>("/admin/takedown", body),
  history: (type: ModerationTargetType, id: string) =>
    api.get<ModerationAction[]>(`/admin/moderation-history/${type}/${id}`),

  stats: () => api.get<Stats>("/admin/stats"),

  reports: (params: { page?: number; limit?: number; status?: ReportStatus }) =>
    api.get<OffsetPage<Report>>("/admin/reports", { params }),
  resolveReport: (id: string, body: { outcome: "ignored" | "deleted" | "restricted"; note?: string }) =>
    api.post<void>(`/admin/reports/${id}/resolve`, body),

  feedback: (params: { page?: number; limit?: number; status?: FeedbackStatus }) =>
    api.get<OffsetPage<AdminFeedback>>("/admin/feedback", { params }),
  replyFeedback: (
    id: string,
    body: { reply?: string; status?: FeedbackStatus },
  ) => api.patch<AdminFeedback>(`/admin/feedback/${id}`, body),

  keywords: () => api.get<Keyword[]>("/admin/keywords"),
  createKeyword: (body: KeywordCreate) => api.post<Keyword>("/admin/keywords", body),
  updateKeyword: (id: string, body: KeywordCreate) =>
    api.patch<Keyword>(`/admin/keywords/${id}`, body),
  deleteKeyword: (id: string) => api.del<void>(`/admin/keywords/${id}`),

  users: (params: { page?: number; limit?: number; q?: string; status?: UserStatus; role?: Role; program?: string; nationality?: string; sort?: UserSortField; order?: "asc" | "desc" }) =>
    api.get<OffsetPage<UserView>>("/admin/users", { params }),
  createUser: (body: AdminUserCreate) => api.post<UserView>("/admin/users", body),
  updateUser: (id: string, status: UserStatus) =>
    api.patch<UserView>(`/admin/users/${id}`, { status }),
  updateUserDetails: (id: string, body: AdminUserUpdate) =>
    api.put<UserView>(`/admin/users/${id}`, body),
  deleteUser: (id: string) => api.del<void>(`/admin/users/${id}`),
  convertUser: (id: string, body: { graduation_year?: string; force?: boolean }) =>
    api.post<UserView>(`/admin/users/${id}/convert`, body),
  batchConvert: (items: { user_id: string; graduation_year?: string }[]) =>
    api.post<{ converted: number }>("/admin/users/convert", { items }),

  strategies: () => api.get<RoleStrategy[]>("/admin/role-strategies"),
  updateStrategy: (body: RoleStrategy) => api.patch<void>("/admin/role-strategies", body),

  faculty: (params: { page?: number; limit?: number; q?: string; sort?: FacultySortField; order?: "asc" | "desc" }) =>
    api.get<OffsetPage<FacultyMember>>("/admin/faculty", { params }),
  createFaculty: (body: FacultyUpsert) =>
    api.post<FacultyMember>("/admin/faculty", body),
  updateFaculty: (id: string, body: Partial<FacultyUpsert>) =>
    api.patch<FacultyMember>(`/admin/faculty/${id}`, body),
  deleteFaculty: (id: string) => api.del<void>(`/admin/faculty/${id}`),

  logs: (params: { page?: number; limit?: number }) =>
    api.get<OffsetPage<OperationLog>>("/admin/operation-logs", { params }),
  clearLogs: () => api.del<void>("/admin/operation-logs"),
};
