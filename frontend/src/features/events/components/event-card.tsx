"use client";

import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { ContentStatusChip } from "@/components/common/status-chip";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { CampusEvent } from "@/lib/api/types";

export function EventCard({ event }: { event: CampusEvent }) {
  const { t } = useI18n();
  return (
    <Card className="min-w-0">
      <Card.Header>
        <div className="flex items-start justify-between gap-2">
          <Card.Title className="min-w-0 leading-snug">
            <Link href={`/events/${event.id}`} className="after:absolute after:inset-0 after:rounded-xl">{event.title}</Link>
          </Card.Title>
          <ContentStatusChip status={event.status} />
        </div>
      </Card.Header>

      <Card.Content>
        <div className="flex flex-col gap-1 text-sm text-muted">
          <span className="flex items-center gap-1"><MapPin size={14} /> {event.location || t.eventDetail.tbd}</span>
          <span className="flex items-center gap-1">
            <Users size={14} />
            {event.capacity == null ? event.registered : `${event.registered}/${event.capacity}`}
          </span>
        </div>
      </Card.Content>

      <Card.Footer className="gap-2">
        <Chip size="sm" variant="tertiary" color="accent">{t.events.types[event.type] ?? event.type}</Chip>
        <span className="flex items-center gap-1 text-xs text-muted"><CalendarDays size={14} /> {formatDate(event.starts_at)}</span>
      </Card.Footer>
    </Card>
  );
}
