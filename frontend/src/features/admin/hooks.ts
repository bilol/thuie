"use client";

import * as React from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { onServer } from "@/lib/realtime/socket";
import type {
  FeedbackStatus,
  KeywordCreate,
  ModerationTargetType,
  ReportStatus,
  Role,
  UserStatus,
} from "@/lib/api/types";
import { adminApi, adminKeys, type AdminUserCreate, type AdminUserUpdate, type FacultySortField, type FacultyUpsert, type UserSortField } from "./api";

const invalidate = (qc: ReturnType<typeof useQueryClient>, key: readonly string[]) =>
  qc.invalidateQueries({ queryKey: key });

export const useReviewQueue = (params: { page?: number; limit?: number; type?: ModerationTargetType } = {}) =>
  useQuery({
    queryKey: adminKeys.review(params),
    queryFn: () => adminApi.review(params),
    placeholderData: keepPreviousData,
  });

export const useModerationAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      kind: "approve" | "reject";
      type: ModerationTargetType;
      id: string;
      reason?: string;
    }) =>
      vars.kind === "approve"
        ? adminApi.approve(vars.type, vars.id)
        : adminApi.reject(vars.type, vars.id, vars.reason ?? ""),
    onSuccess: () => invalidate(qc, ["admin", "review"]),
  });
};

export const useTakedown = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.takedown,
    onSuccess: () => invalidate(qc, ["admin", "review"]),
  });
};

export const useModerationHistory = (type: ModerationTargetType, id: string) =>
  useQuery({
    queryKey: adminKeys.history(type, id),
    queryFn: () => adminApi.history(type, id),
  });

export const useAdminStats = () =>
  useQuery({ queryKey: adminKeys.stats(), queryFn: adminApi.stats, refetchInterval: 30_000 });

export const useAdminReports = (params: { page?: number; limit?: number; status?: ReportStatus } = {}) =>
  useQuery({
    queryKey: adminKeys.reports(params),
    queryFn: () => adminApi.reports(params),
    placeholderData: keepPreviousData,
  });

export const useResolveReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; outcome: "ignored" | "deleted" | "restricted"; note?: string }) =>
      adminApi.resolveReport(vars.id, { outcome: vars.outcome, note: vars.note }),
    onSuccess: () => invalidate(qc, ["admin", "reports"]),
  });
};

export const useAdminFeedback = (params: { page?: number; limit?: number; status?: FeedbackStatus } = {}) =>
  useQuery({
    queryKey: adminKeys.feedback(params),
    queryFn: () => adminApi.feedback(params),
    placeholderData: keepPreviousData,
  });

export const useReplyFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reply?: string; status?: FeedbackStatus }) =>
      adminApi.replyFeedback(vars.id, { reply: vars.reply, status: vars.status }),
    onSuccess: () => invalidate(qc, ["admin", "feedback"]),
  });
};

export const useKeywords = () =>
  useQuery({ queryKey: adminKeys.keywords(), queryFn: adminApi.keywords });

export const useKeywordMutations = () => {
  const qc = useQueryClient();
  const invalidateAll = () => invalidate(qc, adminKeys.keywords());
  return {
    create: useMutation({ mutationFn: adminApi.createKeyword, onSuccess: invalidateAll, meta: { silentError: true } }),
    update: useMutation({
      mutationFn: (vars: { id: string; body: KeywordCreate }) => adminApi.updateKeyword(vars.id, vars.body),
      onSuccess: invalidateAll,
      meta: { silentError: true },
    }),
    remove: useMutation({ mutationFn: (id: string) => adminApi.deleteKeyword(id), onSuccess: invalidateAll }),
  };
};

export const useAdminUsers = (params: { page?: number; limit?: number; q?: string; status?: UserStatus; role?: Role; program?: string; nationality?: string; sort?: UserSortField; order?: "asc" | "desc" } = {}) =>
  useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.users(params),
    placeholderData: keepPreviousData,
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminUserCreate) => adminApi.createUser(body),
    onSuccess: () => invalidate(qc, ["admin", "users"]),
  });
};

export const useUpdateUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: UserStatus }) => adminApi.updateUser(vars.id, vars.status),
    onSuccess: () => invalidate(qc, ["admin", "users"]),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: AdminUserUpdate }) => adminApi.updateUserDetails(vars.id, vars.body),
    onSuccess: () => invalidate(qc, ["admin", "users"]),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => invalidate(qc, ["admin", "users"]),
  });
};

export const useConvertUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; graduation_year?: string; force?: boolean }) =>
      adminApi.convertUser(vars.id, { graduation_year: vars.graduation_year, force: vars.force }),
    onSuccess: () => invalidate(qc, ["admin", "users"]),
  });
};

export const useBatchConvert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.batchConvert,
    onSuccess: () => invalidate(qc, ["admin", "users"]),
  });
};

export const useRoleStrategies = () =>
  useQuery({ queryKey: adminKeys.strategies(), queryFn: adminApi.strategies });

export const useUpdateRoleStrategy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateStrategy,
    onSuccess: () => invalidate(qc, adminKeys.strategies()),
    meta: { silentError: true },
  });
};

export const useOperationLogs = (params: { page?: number; limit?: number } = {}) =>
  useQuery({
    queryKey: adminKeys.logs(params),
    queryFn: () => adminApi.logs(params),
    placeholderData: keepPreviousData,
  });

export const useClearLogs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.clearLogs,
    onSuccess: () => invalidate(qc, ["admin", "operation-logs"]),
  });
};

/** Admin faculty console list (§6.6) — server offset pagination, keeps the
 *  footer Pagination accurate across pages (unlike the public cursor feed). */
export const useAdminFaculty = (params: { page?: number; limit?: number; q?: string; sort?: FacultySortField; order?: "asc" | "desc" } = {}) =>
  useQuery({
    queryKey: adminKeys.faculty(params),
    queryFn: () => adminApi.faculty(params),
    placeholderData: keepPreviousData,
  });

/** Faculty directory CRUD (§6.6) — invalidates the shared `faculty` list cache. */
export const useFacultyMutations = () => {
  const qc = useQueryClient();
  // Writes affect both the public directory feed (`faculty`) and the admin
  // console list (`admin/faculty`), so refresh whichever is mounted.
  const invalidateFaculty = () => {
    invalidate(qc, ["faculty"]);
    invalidate(qc, ["admin", "faculty"]);
  };
  return {
    create: useMutation({ mutationFn: adminApi.createFaculty, onSuccess: invalidateFaculty }),
    update: useMutation({
      mutationFn: (vars: { id: string; body: Partial<FacultyUpsert> }) =>
        adminApi.updateFaculty(vars.id, vars.body),
      onSuccess: invalidateFaculty,
    }),
    remove: useMutation({ mutationFn: (id: string) => adminApi.deleteFaculty(id), onSuccess: invalidateFaculty }),
  };
};

/** Live moderation queue updates for the admin room (§9 `moderation:status`). */
export function useModerationRealtime() {
  const qc = useQueryClient();
  React.useEffect(
    () => onServer("moderation:status", () => invalidate(qc, ["admin", "review"])),
    [qc],
  );
}
