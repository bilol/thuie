"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input, TextField } from "@heroui/react";
import { Plus, Search } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { useCan } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import {
  ForumCard,
  usePostsFeed,
  type PostListParams,
} from "@/features/forum";

export default function ForumPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const canPost = useCan("can_post_forum");

  const params: PostListParams = React.useMemo(() => ({ q: query || undefined }), [query]);
  const feed = usePostsFeed(params);
  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {canPost ? (
          <Button variant="primary" onPress={() => router.push("/forum/new")}>
            <Plus size={18} />
            {t.forum.newThread}
          </Button>
        ) : (
          <Button isDisabled aria-label={t.forum.cannotPostAria}>{t.forum.newThread}</Button>
        )}
      </div>

      <form
        className="mb-5 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <TextField aria-label={t.forum.searchAria} name="q" className="min-w-0 flex-1">
          <Input placeholder={t.forum.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </TextField>
        <Button type="submit" variant="primary">
          <Search size={16} />
          {t.common.search}
        </Button>
      </form>

      <StateBoundary
        isLoading={feed.isLoading}
        isError={feed.isError}
        error={feed.error}
        isEmpty={items.length === 0}
        onRetry={() => feed.refetch()}
        emptyBody={t.forum.empty}
      >
        <div className="grid gap-3">
          {items.map((p) => (
            <ForumCard key={p.id} post={p} />
          ))}
        </div>
        <LoadMore hasNextPage={feed.hasNextPage} isFetching={feed.isFetchingNextPage} onLoadMore={() => feed.fetchNextPage()} />
      </StateBoundary>
    </div>
  );
}
