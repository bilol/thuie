"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Card, Chip, ProgressBar, Separator, Typography } from "@heroui/react";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { PendingButton } from "@/components/common/pending-button";
import { ContentStatusChip } from "@/components/common/status-chip";
import { formatDateTime } from "@/lib/format";
import {
  useCancelRegistration,
  useEvent,
  useEventTicket,
  useRegisterEvent,
} from "@/features/events";
import { apiErrorMessage } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const event = useEvent(id);
  const register = useRegisterEvent(id);
  const cancel = useCancelRegistration(id);

  const data = event.data;
  // Detail collapses `registered` to the viewer's own seat flag; the taken count
  // is reconstructed from capacity minus the remaining spots.
  const isRegistered = !!data?.registered;
  const attended = data?.my_status === "attended";
  const ticket = useEventTicket(id, isRegistered && !attended);
  const taken = data && data.capacity != null && data.spots_left != null ? data.capacity - data.spots_left : 0;
  const fill = data && data.capacity ? Math.min(100, Math.round((taken / data.capacity) * 100)) : 0;
  const isFull = !!data && data.capacity != null && (data.spots_left ?? 0) <= 0;

  return (
    <div className="mx-auto max-w-2xl">
      <StateBoundary isLoading={event.isLoading} isError={event.isError} error={event.error} isEmpty={!data}>
        {data && (
          <Card>
            {data.cover_url && <img src={data.cover_url} alt={data.title} className="h-48 w-full object-cover" />}
            <Card.Content className="gap-4">
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="tertiary" color="accent">{t.events.types[data.type] ?? data.type}</Chip>
                <ContentStatusChip status={data.status} />
              </div>
              <Typography type="h1" weight="bold" className="text-2xl">{data.title}</Typography>
              <div className="space-y-1 text-sm text-muted">
                <p className="flex items-center gap-2"><CalendarDays size={16} /> {formatDateTime(data.starts_at)}{data.ends_at ? ` – ${formatDateTime(data.ends_at)}` : ""}</p>
                <p className="flex items-center gap-2"><MapPin size={16} /> {data.location || t.eventDetail.tbd}</p>
                {data.organizer && <p className="flex items-center gap-2"><Users size={16} /> {data.organizer}</p>}
              </div>

              {data.description && <p className="prose-body">{data.description}</p>}

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>{t.eventDetail.registered(taken)}</span>
                  <span>{data.capacity ? t.eventDetail.seats(data.capacity) : t.eventDetail.unlimited}</span>
                </div>
                {!!data.capacity && (
                  <ProgressBar value={fill} size="sm" color={isFull ? "danger" : "accent"} aria-label={t.eventDetail.capacityAria}>
                    <ProgressBar.Track>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-2">
                {isRegistered ? (
                  <>
                    <PendingButton variant="secondary" pending={cancel.isPending} onPress={() => cancel.mutate()}>
                      {t.eventDetail.cancelRegistration}
                    </PendingButton>
                    {ticket.data && (
                      <div className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-dashed border-separator px-3 py-2">
                        <Ticket size={16} className="shrink-0 text-accent" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted">{t.eventDetail.ticketToken}</p>
                          <p className="break-all font-mono text-sm">{ticket.data.ticket}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <PendingButton
                    variant="primary"
                    pending={register.isPending}
                    isDisabled={data.status !== "published" || isFull}
                    onPress={() => register.mutate()}
                  >
                    {data.status !== "published" ? t.eventDetail.notOpen : isFull ? t.eventDetail.full : t.eventDetail.register}
                  </PendingButton>
                )}
              </div>
              {(register.isError || cancel.isError) && (
                <p className="text-sm text-danger">{apiErrorMessage(register.error ?? cancel.error)}</p>
              )}
            </Card.Content>
          </Card>
        )}
      </StateBoundary>
    </div>
  );
}
