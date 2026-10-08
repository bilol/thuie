"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { ConnectionCard, useConnections } from "@/features/connections";
import { useI18n } from "@/lib/i18n";

export default function ConnectionsPage() {
  const { t } = useI18n();
  const conns = useConnections("mine");
  const items = conns.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end">
        <Link href="/connections/requests" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent">
          <Inbox size={16} />
          {t.connections.requests}
        </Link>
      </div>

      <StateBoundary
        isLoading={conns.isLoading}
        isError={conns.isError}
        error={conns.error}
        isEmpty={items.length === 0}
        emptyTitle={t.connections.noConnections}
        emptyBody={<>{t.connections.findPeoplePrefix}<Link href="/alumni" className="text-accent hover:underline">{t.connections.alumniDirectory}</Link>{t.connections.findPeopleSuffix}</>}
      >
        <div className="grid gap-2">
          {items.map((c) => (
            <ConnectionCard key={c.id} connection={c} />
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
