"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Card,
  Input,
  Label,
  NumberField,
  TextArea,
  TextField,
} from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { MediaPicker } from "@/components/common/media-picker";
import { OptionSelect } from "@/components/common/option-select";
import { DateTimeField } from "@/components/common/date-time-field";
import { useCurrentUser } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { useCreateEvent } from "@/features/events";
import { ApiErrorAlert } from "@/components/common/alerts";
import type { CalendarDateTime } from "@internationalized/date";
import type { EventCreate, EventType } from "@/lib/api/types";

const EVENT_TYPES: EventType[] = ["recruitment", "lecture", "sharing", "ceremony", "sports", "other"];

export default function NewEventPage() {
  const router = useRouter();
  const me = useCurrentUser();
  const { t } = useI18n();
  const create = useCreateEvent();
  const isAdminUser = me?.role === "admin" || me?.role === "admin_super";
  const [form, setForm] = React.useState<EventCreate>({
    title: "",
    starts_at: "",
    type: "other",
    status: "published",
  });
  const [cover, setCover] = React.useState<string[]>([]);
  const [start, setStart] = React.useState<CalendarDateTime | null>(null);
  const [end, setEnd] = React.useState<CalendarDateTime | null>(null);

  const set = <K extends keyof EventCreate>(k: K, v: EventCreate[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (!isAdminUser) {
    return (
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t.newEvent.adminsOnlyTitle}</Alert.Title>
          <Alert.Description>{t.newEvent.adminsOnlyBody}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  const valid = form.title.trim().length > 0 && !!start;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <Card.Content className="gap-4">
          {create.isError && <ApiErrorAlert error={create.error} />}
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const body: EventCreate = {
                ...form,
                starts_at: start ? start.toString() : "",
                ends_at: end ? end.toString() : undefined,
                cover_media_id: cover[0],
              };
              create.mutate(body, { onSuccess: (ev) => router.push(`/events/${ev.id}`) });
            }}
          >
            <TextField name="title">
              <Label>{t.common.title}</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
            </TextField>
            <TextField name="description">
              <Label>{t.common.description}</Label>
              <TextArea rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </TextField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateTimeField label={t.newEvent.startsAt} value={start} onChange={setStart} />
              <DateTimeField label={t.newEvent.endsAtOptional} value={end} onChange={setEnd} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="location">
                <Label>{t.common.location}</Label>
                <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
              </TextField>
              <TextField name="organizer">
                <Label>{t.common.organizer}</Label>
                <Input value={form.organizer ?? ""} onChange={(e) => set("organizer", e.target.value)} />
              </TextField>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <OptionSelect
                label={t.common.type}
                ariaLabel={t.common.type}
                value={form.type ?? "other"}
                onChange={(k) => set("type", k as EventType)}
                options={EVENT_TYPES.map((evType) => ({ key: evType, label: t.events.types[evType] ?? evType }))}
              />
              <NumberField
                name="capacity"
                minValue={0}
                value={form.capacity}
                onChange={(v) => set("capacity", Number.isNaN(v) ? undefined : v)}
              >
                <Label>{t.common.capacity}</Label>
                <NumberField.Group>
                  <NumberField.Input />
                  <NumberField.DecrementButton />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t.common.coverImage}</p>
              <MediaPicker kind="image" max={1} value={cover} onChange={setCover} />
            </div>
            <PendingButton type="submit" variant="primary" pending={create.isPending} isDisabled={!valid} fullWidth>
              {t.newEvent.createEvent}
            </PendingButton>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
