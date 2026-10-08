"use client";

import * as React from "react";
import { Button } from "@heroui/react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { MentorshipApplicationCard, useMentorshipApplications } from "@/features/mentorship";
import { useI18n } from "@/lib/i18n";

export default function MentorshipApplicationsPage() {
  const { t } = useI18n();
  const [box, setBox] = React.useState<"outgoing" | "incoming">("outgoing");
  const apps = useMentorshipApplications(box);
  const items = apps.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={box === "outgoing" ? "primary" : "tertiary"} onPress={() => setBox("outgoing")}>
          {t.mentorship.tabSent}
        </Button>
        <Button size="sm" variant={box === "incoming" ? "primary" : "tertiary"} onPress={() => setBox("incoming")}>
          {t.mentorship.tabReceived}
        </Button>
      </div>
      <StateBoundary isLoading={apps.isLoading} isError={apps.isError} error={apps.error} isEmpty={items.length === 0} emptyTitle={t.mentorship.noApplications} skeletonRows={2}>
        <div className="grid gap-3">
          {items.map((a) => (
            <MentorshipApplicationCard key={a.id} application={a} direction={box} />
          ))}
        </div>
        <LoadMore hasNextPage={apps.hasNextPage} isFetching={apps.isFetchingNextPage} onLoadMore={() => apps.fetchNextPage()} />
      </StateBoundary>
    </div>
  );
}
