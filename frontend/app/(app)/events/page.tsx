"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Plus, Ticket } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { useCurrentUser } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { EventCard, useEventsFeed, type EventListParams } from "@/features/events";
import type { EventType } from "@/lib/api/types";

const FILTERS: { key: string; type?: EventType }[] = [
  { key: "all" },
  { key: "recruitment", type: "recruitment" },
  { key: "lecture", type: "lecture" },
  { key: "other", type: "other" },
];

const LIMIT = 12;

export default function EventsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = React.useState("all");
  const me = useCurrentUser();
  const isAdminUser = me?.role === "admin" || me?.role === "admin_super";

  const type = FILTERS.find((x) => x.key === tab)?.type;
  const params: EventListParams = React.useMemo(() => ({ type, limit: LIMIT }), [type]);
  const feed = useEventsFeed(params);
  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Button variant="secondary" onPress={() => router.push("/events/registrations")}>
          <Ticket size={16} />
          {t.myRegistrations.title}
        </Button>
        {isAdminUser && (
          <Button variant="primary" onPress={() => router.push("/events/new")}><Plus size={18} />{t.events.newEvent}</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" aria-label={t.events.typeAria}>
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={tab === item.key ? "primary" : "tertiary"}
            onPress={() => setTab(item.key)}
          >
            {t.events.types[item.key]}
          </Button>
        ))}
      </div>

      <div className="mt-5">
        <StateBoundary
          isLoading={feed.isLoading}
          isError={feed.isError}
          error={feed.error}
          isEmpty={items.length === 0}
          onRetry={() => feed.refetch()}
          emptyBody={t.events.empty}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
          <LoadMore
            hasNextPage={!!feed.hasNextPage}
            isFetching={feed.isFetchingNextPage}
            onLoadMore={() => feed.fetchNextPage()}
          />
        </StateBoundary>
      </div>
    </div>
  );
}
