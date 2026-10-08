"use client";

import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { ConnectionRequestCard, useConnections } from "@/features/connections";
import { useI18n } from "@/lib/i18n";

export default function ConnectionRequestsPage() {
  const { t } = useI18n();
  const conns = useConnections("requests");
  const items = conns.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <StateBoundary
        isLoading={conns.isLoading}
        isError={conns.isError}
        error={conns.error}
        isEmpty={items.length === 0}
        emptyTitle={t.connections.noPending}
      >
        <div className="grid gap-2">
          {items.map((c) => (
            <ConnectionRequestCard key={c.id} connection={c} />
          ))}
        </div>
        <LoadMore
          hasNextPage={conns.hasNextPage}
          isFetching={conns.isFetchingNextPage}
          onLoadMore={() => conns.fetchNextPage()}
        />
      </StateBoundary>
    </div>
  );
}
