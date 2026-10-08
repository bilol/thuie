"use client";

import Link from "next/link";
import { Card, Chip, Typography } from "@heroui/react";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { useMyRegistrations } from "@/features/me";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MyEventRegistration } from "@/lib/api/types";

function RegistrationRow({ reg }: { reg: MyEventRegistration }) {
  const { t } = useI18n();
  const e = reg.event;
  if (!e) return null;
  const label = t.myRegistrations.statuses[reg.status];
  return (
    <Card>
      {e.cover_url && <img src={e.cover_url} alt={e.title} className="h-32 w-full object-cover" />}
      <Card.Content className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <Typography type="h6" className="min-w-0 leading-snug">{e.title}</Typography>
          <Chip
            size="sm"
            variant={reg.status === "attended" ? "primary" : "tertiary"}
            color={reg.status === "attended" ? "accent" : undefined}
            className="shrink-0"
          >
            <Chip.Label>{label}</Chip.Label>
          </Chip>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1"><CalendarDays size={14} /> {formatDateTime(e.starts_at)}</span>
          <span className="flex items-center gap-1"><MapPin size={14} /> {e.location || t.eventDetail.tbd}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {reg.has_ticket && reg.status === "registered" && (
            <Chip size="sm" variant="secondary" color="accent">
              <Ticket size={12} />
              <Chip.Label>{t.myRegistrations.ticket}</Chip.Label>
            </Chip>
          )}
          <Link
            href={`/events/${e.id}`}
            className={cn("inline-flex items-center rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft")}
          >
            {t.myRegistrations.viewEvent}
          </Link>
        </div>
      </Card.Content>
    </Card>
  );
}

export default function MyRegistrationsPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useMyRegistrations();
  const regs = data ?? [];
  const now = Date.now();
  const isPast = (r: MyEventRegistration) =>
    !r.event || new Date(r.event.starts_at).getTime() < now;
  const upcoming = regs.filter((r) => !isPast(r));
  const past = regs.filter(isPast);

  const section = (title: string, list: MyEventRegistration[]) =>
    list.length > 0 ? (
      <div className="space-y-3">
        <Typography type="h4">{title}</Typography>
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((r) => (
            <RegistrationRow key={r.event_id} reg={r} />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <StateBoundary
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={regs.length === 0}
      onRetry={() => refetch()}
      emptyTitle={t.myRegistrations.title}
      emptyBody={t.myRegistrations.empty}
    >
      <div className="space-y-6">
        {section(t.myRegistrations.upcoming, upcoming)}
        {section(t.myRegistrations.past, past)}
      </div>
    </StateBoundary>
  );
}
