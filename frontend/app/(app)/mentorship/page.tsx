"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input, TextField } from "@heroui/react";
import { Inbox, UserPlus } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { MentorCard, useMentors } from "@/features/mentorship";
import { useI18n } from "@/lib/i18n";

export default function MentorshipPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [area, setArea] = React.useState("");
  const mentors = useMentors(area || undefined);
  const items = mentors.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <TextField aria-label={t.mentorship.filterAria} className="max-w-sm flex-1">
          <Input placeholder={t.mentorship.filterPlaceholder} value={area} onChange={(e) => setArea(e.target.value)} />
        </TextField>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={() => router.push("/mentorship/applications")}>
            <Inbox size={16} /> {t.mentorship.tabs.apps}
          </Button>
          <Button variant="primary" onPress={() => router.push("/mentorship/become")}>
            <UserPlus size={16} /> {t.mentorship.tabs.become}
          </Button>
        </div>
      </div>
      <StateBoundary isLoading={mentors.isLoading} isError={mentors.isError} error={mentors.error} isEmpty={items.length === 0} emptyTitle={t.mentorship.noMentors}>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((m, i) => (
            <MentorCard key={m.user?.id ?? i} mentor={m} />
          ))}
        </div>
        <LoadMore hasNextPage={mentors.hasNextPage} isFetching={mentors.isFetchingNextPage} onLoadMore={() => mentors.fetchNextPage()} />
      </StateBoundary>
    </div>
  );
}
