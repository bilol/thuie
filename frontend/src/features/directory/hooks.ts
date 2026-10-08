"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { AlumniUpdate } from "@/lib/api/types";
import {
  dirApi,
  dirKeys,
  type AlumniListParams,
  type FacultyListParams,
} from "./api";

export const useDepartments = () =>
  useQuery({
    queryKey: dirKeys.departments(),
    queryFn: dirApi.departments,
    staleTime: 5 * 60_000,
  });

export const useAlumniFeed = (params: AlumniListParams = {}) =>
  useInfiniteQuery({
    queryKey: dirKeys.alumni(params),
    queryFn: ({ pageParam }) => dirApi.alumniList({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useAlumni = (id: string) =>
  useQuery({ queryKey: dirKeys.alumniDetail(id), queryFn: () => dirApi.alumniGet(id) });

export const useAlumniConnections = (id: string) =>
  useQuery({
    queryKey: dirKeys.alumniConnections(id),
    queryFn: () => dirApi.alumniConnections(id),
  });

export const useMyAlumniProfile = () =>
  useQuery({
    queryKey: dirKeys.myAlumni(),
    queryFn: dirApi.myAlumni,
    retry: (n, err) => (err && (err as any).status === 404 ? false : n < 2),
  });

export const useSaveAlumniProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { body: AlumniUpdate; version?: number }) =>
      vars.version == null
        ? dirApi.createAlumni(vars.body)
        : dirApi.updateAlumni(vars.body, vars.version),
    onSuccess: () => qc.invalidateQueries({ queryKey: dirKeys.myAlumni() }),
    meta: { silentError: true },
  });
};

export const useSetAlumniSkills = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dirApi.setSkills,
    onSuccess: () => qc.invalidateQueries({ queryKey: dirKeys.myAlumni() }),
    meta: { silentError: true },
  });
};

/** Ask admins to change a published profile's visibility / contact exposure (§6.5). */
export const useRequestVisibility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dirApi.requestVisibility,
    onSuccess: () => qc.invalidateQueries({ queryKey: dirKeys.myAlumni() }),
    meta: { silentError: true },
  });
};

/** Public faculty feed — cursor envelope (`meta.nextCursor`), the same infinite
 *  pattern the alumni directory uses on web and mobile. Defaults `limit` to the
 *  API's per-page cap so the small curated directory loads in one shot; callers
 *  can still override it via `params.limit`. */
export const useFacultyFeed = (params: FacultyListParams = {}) =>
  useInfiniteQuery({
    queryKey: dirKeys.faculty(params),
    queryFn: ({ pageParam }) => dirApi.facultyList({ limit: 50, ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });

export const useFaculty = (id: string) =>
  useQuery({ queryKey: dirKeys.facultyDetail(id), queryFn: () => dirApi.facultyGet(id) });
