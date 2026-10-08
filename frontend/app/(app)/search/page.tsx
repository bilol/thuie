"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Avatar, Button, Card, Input, TextField, Typography } from "@heroui/react";
import { Search } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { useI18n } from "@/lib/i18n";
import { useSearch, useSuggest } from "@/features/search";
import type { SearchType, SearchResultItem } from "@/lib/api/types";

const TYPES: { key: SearchType }[] = [
  { key: "all" },
  { key: "info" },
  { key: "post" },
  { key: "profile" },
  { key: "event" },
  { key: "faculty" },
];

function hrefFor(item: SearchResultItem): string {
  const t = item.type.toLowerCase();
  const id = item.id;
  if (t.includes("info")) return `/infos/${id}`;
  if (t.includes("post")) return `/forum/${id}`;
  if (t.includes("profile") || t.includes("alumni") || t.includes("user")) return `/alumni/${id}`;
  if (t.includes("event")) return `/events/${id}`;
  if (t.includes("faculty")) return `/faculty/${id}`;
  return `/search?q=${encodeURIComponent(item.title)}`;
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const q = params.get("q") ?? "";
  const [term, setTerm] = React.useState(q);
  React.useEffect(() => setTerm(q), [q]);
  const [type, setType] = React.useState<SearchType>("all");
  const { data, isFetching, isError, error } = useSearch(q, type);
  const results = data ?? [];
  const suggest = useSuggest(term);
  const suggestions = suggest.data ?? [];
  const showSuggestions = term.trim().length > 1 && term.trim() !== q.trim() && suggestions.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = term.trim();
    router.replace(v ? `/search?q=${encodeURIComponent(v)}` : "/search");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={submit} className="mb-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden />
          <TextField aria-label={t.common.search}>
            <Input
              type="search"
              placeholder={t.shell.searchPlaceholder}
              value={term}
              autoFocus
              onChange={(e) => setTerm(e.target.value)}
              className="pl-9"
            />
          </TextField>
        </div>
      </form>

      {showSuggestions && (
        <Card className="mb-4">
          <Card.Content className="gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{t.search.suggestions}</p>
            {suggestions.map((s) => (
              <Link
                key={`${s.type}:${s.value}`}
                href={`/search?q=${encodeURIComponent(s.label)}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent-soft"
              >
                {s.type === "user" && (
                  <Avatar size="sm" className="shrink-0">
                    {s.avatar_url && <Avatar.Image src={s.avatar_url} alt={s.label} />}
                    <Avatar.Fallback>{s.label[0] ?? "?"}</Avatar.Fallback>
                  </Avatar>
                )}
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="shrink-0 text-xs uppercase tracking-wide text-muted">{s.type}</span>
              </Link>
            ))}
          </Card.Content>
        </Card>
      )}

      {!q ? (
        <p className="text-sm text-muted">{t.search.hint}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {TYPES.map((tab) => (
              <Button key={tab.key} size="sm" variant={type === tab.key ? "primary" : "tertiary"} onPress={() => setType(tab.key)}>
                {t.search.categories[tab.key]}
              </Button>
            ))}
          </div>
          <div className="mt-5">
            <StateBoundary
              isLoading={isFetching && results.length === 0}
              isError={isError}
              error={error}
              isEmpty={results.length === 0}
              emptyTitle={t.search.noResults}
              emptyBody={t.search.nothingMatched(q, type === "all" ? t.search.anyCategory : t.search.categories[type])}
            >
              <div className="grid gap-3">
                {results.map((item) => (
                  <Link key={`${item.type}:${item.id}`} href={hrefFor(item)} className="block">
                    <Card>
                      <Card.Content className="gap-1">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span className="uppercase tracking-wide">{item.type}</span>
                        </div>
                        <Typography type="h6">{item.title}</Typography>
                        {item.snippet && <p className="line-clamp-2 text-sm text-muted">{item.snippet}</p>}
                      </Card.Content>
                    </Card>
                  </Link>
                ))}
              </div>
            </StateBoundary>
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense fallback={null}>
      <SearchInner />
    </React.Suspense>
  );
}
