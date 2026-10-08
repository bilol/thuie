"use client";

import { api } from "@/lib/api/client";
import type { SearchType, SearchResultItem, Suggestion } from "@/lib/api/types";

/** Cross-resource search (FTS / pg_trgm) + autocomplete suggestions. */

export const searchKeys = {
  results: (q: string, type: SearchType) => ["search", q, type] as const,
  suggest: (q: string, scope: string) => ["search", "suggest", q, scope] as const,
};

export const searchApi = {
  // `GET /search` returns `{ data: [...buckets], meta }` (mobile `run` reads
  // `json['data']`), not `{ results }`; unwrap to the flat hit list.
  run: (params: { q: string; type?: SearchType }) =>
    api
      .get<{ data: SearchResultItem[] }>("/search", { params })
      .then((r) => r.data),
  suggest: (params: { q: string; scope?: "tags" | "skills" | "departments" | "users" | "all" }) =>
    api.get<Suggestion[]>("/search/suggest", { params }),
};
