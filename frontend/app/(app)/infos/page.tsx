"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { useCan } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { InfoCard, useInfosFeed, type InfoListParams } from "@/features/infos";
import type { InfoCategory } from "@/lib/api/types";

const TABS: { key: string; category?: InfoCategory }[] = [
  { key: "all" },
  { key: "internal", category: "internal" },
  { key: "open", category: "open" },
  { key: "recruitment", category: "recruitment" },
];

export default function InfosPage() {
  const router = useRouter();
  const { t } = useI18n();
  const canSubmit = useCan("can_submit_info");
  const [tab, setTab] = React.useState("all");
  const params: InfoListParams = React.useMemo(() => {
    const found = TABS.find((x) => x.key === tab);
    return found?.category ? { category: found.category } : {};
  }, [tab]);

  const feed = useInfosFeed(params);
  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {canSubmit ? (
          <Button variant="primary" onPress={() => router.push("/infos/new")}>
            <Plus size={18} />
            {t.infos.submit}
          </Button>
        ) : (
          <Button isDisabled aria-label={t.infos.cannotSubmitAria}>{t.infos.submit}</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" aria-label={t.infos.categoryAria}>
        {TABS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={tab === item.key ? "primary" : "tertiary"}
            onPress={() => setTab(item.key)}
          >
            {t.infos.tabs[item.key]}
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
          emptyBody={t.infos.empty}
        >
          <div className="grid gap-3">
            {items.map((info) => (
              <InfoCard key={info.id} info={info} />
            ))}
          </div>
          <LoadMore
            hasNextPage={feed.hasNextPage}
            isFetching={feed.isFetchingNextPage}
            onLoadMore={() => feed.fetchNextPage()}
          />
        </StateBoundary>
      </div>
    </div>
  );
}
