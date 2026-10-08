"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { mentorApi, mentorKeys } from "./api";

export const useMentors = (area?: string) =>
  useInfiniteQuery({
    queryKey: mentorKeys.mentors(area),
    queryFn: ({ pageParam }) => mentorApi.mentors(area, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useMentorshipApplications = (role: "incoming" | "outgoing") =>
  useInfiniteQuery({
    queryKey: [...mentorKeys.applications(), role],
    queryFn: ({ pageParam }) => mentorApi.applications(role, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useBecomeMentor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mentorApi.becomeMentor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentorship"] }),
    meta: { silentError: true },
  });
};

export const useApplyMentorship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mentorApi.apply,
    onSuccess: () => qc.invalidateQueries({ queryKey: mentorKeys.applications() }),
    meta: { silentError: true },
  });
};

export const useRespondApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: "accepted" | "rejected" }) =>
      mentorApi.respond(vars.id, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: mentorKeys.applications() }),
  });
};

export const useWithdrawApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mentorApi.withdraw(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mentorKeys.applications() }),
  });
};
