"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Card,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { MediaPicker } from "@/components/common/media-picker";
import { OptionSelect } from "@/components/common/option-select";
import { useCan } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { useCreateInfo } from "@/features/infos";
import { ApiError } from "@/lib/api/errors";
import { ApiErrorAlert } from "@/components/common/alerts";
import type { InfoCreate } from "@/lib/api/types";

export default function NewInfoPage() {
  const router = useRouter();
  const create = useCreateInfo();
  const { t } = useI18n();
  const canSubmit = useCan("can_submit_info");
  const [form, setForm] = React.useState<InfoCreate>({
    title: "",
    content: "",
    category: "open",
    visibility: "all",
    media_ids: [],
  });

  const set = <K extends keyof InfoCreate>(k: K, v: InfoCreate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const err = create.error;
  const isApi = err instanceof ApiError;
  const valid = form.title.trim().length > 0 && form.content.trim().length > 0;

  if (!canSubmit) {
    return (
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t.newInfo.disabledTitle}</Alert.Title>
          <Alert.Description>
            {t.newInfo.disabledBody}
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <Card.Content className="gap-4">
          {err && <ApiErrorAlert error={err} />}

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form, { onSuccess: (info) => router.push(`/infos/${info.id}`) });
            }}
          >
            <TextField name="title" isInvalid={isApi && !!err.fieldError("title")}>
              <Label>{t.common.title}</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
              <FieldError>{isApi ? err.fieldError("title") : undefined}</FieldError>
            </TextField>
            <TextField name="content" isInvalid={isApi && !!err.fieldError("content")}>
              <Label>{t.common.content}</Label>
              <TextArea rows={6} value={form.content} onChange={(e) => set("content", e.target.value)} />
              <FieldError>{isApi ? err.fieldError("content") : undefined}</FieldError>
            </TextField>
            <OptionSelect
              label={t.common.category}
              value={form.category ?? "open"}
              onChange={(k) => set("category", k as InfoCreate["category"])}
              options={[
                { key: "open", label: t.infos.tabs.open },
                { key: "recruitment", label: t.infos.tabs.recruitment },
                { key: "internal", label: t.infos.tabs.internal },
              ]}
            />
            <OptionSelect
              label={t.common.visibility}
              value={form.visibility ?? "all"}
              onChange={(k) => set("visibility", k as InfoCreate["visibility"])}
              options={[
                { key: "all", label: t.newInfo.everyone },
                { key: "student_only", label: t.newInfo.studentsOnly },
              ]}
            />
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t.common.images}</p>
              <MediaPicker
                kind="image"
                max={4}
                value={form.media_ids ?? []}
                onChange={(ids) => set("media_ids", ids)}
              />
            </div>
            <PendingButton type="submit" variant="primary" pending={create.isPending} isDisabled={!valid} fullWidth>
              {t.newInfo.submitReview}
            </PendingButton>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
