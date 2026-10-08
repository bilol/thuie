"use client";

import * as React from "react";
import { Button, Input, TextField } from "@heroui/react";
import { Search } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { useI18n } from "@/lib/i18n";
import {
  FacultyCard,
  useFacultyFeed,
  type FacultyListParams,
} from "@/features/directory";

export default function FacultyPage() {
  const { t } = useI18n();
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");

  const params: FacultyListParams = React.useMemo(
    () => ({ q: query || undefined }),
    [query],
  );
  const feed = useFacultyFeed(params);
  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(q.trim());
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <form className="flex flex-1 flex-wrap items-end gap-2" onSubmit={submit}>
          <TextField aria-label={t.faculty.searchAria} name="q" className="min-w-0 flex-1">
            <Input placeholder={t.faculty.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </TextField>
          <Button type="submit" variant="primary">
            <Search size={16} />
            {t.common.search}
          </Button>
        </form>
      </div>

      <StateBoundary
        isLoading={feed.isLoading}
        isError={feed.isError}
        error={feed.error}
        isEmpty={items.length === 0}
        onRetry={() => feed.refetch()}
        emptyBody={t.faculty.empty}
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => (
            <FacultyCard key={m.id} member={m} />
          ))}
        </div>
        <LoadMore
          hasNextPage={feed.hasNextPage}
          isFetching={feed.isFetchingNextPage}
          onLoadMore={() => feed.fetchNextPage()}
        />
      </StateBoundary>
    </div>
  );
}
