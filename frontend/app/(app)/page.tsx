"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Typography } from "@heroui/react";
import { CalendarPlus, Megaphone, MessageSquarePlus, Users } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { useCan } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { InfoCard, useInfosPreview } from "@/features/infos";
import { EventCard, useEventsFeed } from "@/features/events";

export default function HomePage() {
  const router = useRouter();
  const canSubmitInfo = useCan("can_submit_info");
  const canPostForum = useCan("can_post_forum");
  const { t } = useI18n();
  const infos = useInfosPreview({ limit: 5 });
  const events = useEventsFeed({ limit: 4 });
  const upcomingEvents = events.data?.pages[0]?.data ?? [];

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button variant="secondary" fullWidth isDisabled={!canSubmitInfo} aria-label={canSubmitInfo ? undefined : t.infos.cannotSubmitAria} onPress={() => router.push("/infos/new")}>
          <Megaphone size={18} />
          {t.home.postInfo}
        </Button>
        <Button variant="secondary" fullWidth isDisabled={!canPostForum} aria-label={canPostForum ? undefined : t.forum.cannotPostAria} onPress={() => router.push("/forum/new")}>
          <MessageSquarePlus size={18} />
          {t.home.newThread}
        </Button>
        <Button variant="secondary" fullWidth onPress={() => router.push("/alumni")}>
          <Users size={18} />
          {t.home.findAlumni}
        </Button>
        <Button variant="secondary" fullWidth onPress={() => router.push("/events")}>
          <CalendarPlus size={18} />
          {t.home.eventsCta}
        </Button>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <Typography type="h5">{t.home.latestInfo}</Typography>
          <Link href="/infos" className="text-sm text-accent hover:underline">
            {t.common.viewAll}
          </Link>
        </div>
        <StateBoundary isLoading={infos.isLoading} isError={infos.isError} error={infos.error} isEmpty={!infos.data?.data.length}>
          <div className="grid gap-3 sm:grid-cols-2">
            {infos.data?.data.slice(0, 4).map((info) => (
              <InfoCard key={info.id} info={info} />
            ))}
          </div>
        </StateBoundary>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <Typography type="h5">{t.home.upcomingEvents}</Typography>
          <Link href="/events" className="text-sm text-accent hover:underline">
            {t.common.viewAll}
          </Link>
        </div>
        <StateBoundary isLoading={events.isLoading} isError={events.isError} error={events.error} isEmpty={upcomingEvents.length === 0}>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingEvents.slice(0, 4).map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </StateBoundary>
      </section>
    </div>
  );
}
