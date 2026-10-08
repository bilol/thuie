"use client";

import { useQuery } from "@tanstack/react-query";
import type { SearchType } from "@/lib/api/types";
import { searchApi, searchKeys } from "./api";

export const useSearch = (q: string, type: SearchType = "all", enabled = true) =>
  useQuery({
    queryKey: searchKeys.results(q, type),
    queryFn: () => searchApi.run({ q, type }),
    enabled: enabled && q.trim().length > 0,
  });

export const useSuggest = (q: string, scope: "tags" | "skills" | "departments" | "users" | "all" = "all") =>
  useQuery({
    queryKey: searchKeys.suggest(q, scope),
    queryFn: () => searchApi.suggest({ q, scope }),
    enabled: q.trim().length > 1,
    staleTime: 15_000,
  });
