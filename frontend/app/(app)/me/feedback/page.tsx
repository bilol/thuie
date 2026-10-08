"use client";

import * as React from "react";
import { Card, Chip, Label, TextArea, TextField } from "@heroui/react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { ApiErrorAlert, SuccessAlert } from "@/components/common/alerts";
import { PendingButton } from "@/components/common/pending-button";
import { formatDate } from "@/lib/format";
import { useMyFeedback, useSubmitFeedback } from "@/features/feedback";
import { useI18n } from "@/lib/i18n";
import type { Feedback } from "@/lib/api/types";

const STATUS_COLOR: Record<Feedback["status"], "default" | "accent" | "success"> = {
  open: "default",
  answered: "success",
  closed: "accent",
};

function FeedbackCard({ fb }: { fb: Feedback }) {
  const { t } = useI18n();
  return (
    <Card>
      <Card.Content className="gap-2">
        <Chip size="sm" variant="tertiary" color={STATUS_COLOR[fb.status]}>{t.statuses[fb.status] ?? fb.status}</Chip>
        <p className="whitespace-pre-wrap text-sm text-foreground">{fb.content}</p>
        {fb.reply && (
          <div className="rounded-lg border-l-2 border-accent bg-surface p-3">
            <p className="mb-1 text-xs font-medium text-accent">{t.meFeedback.teamReply}</p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{fb.reply}</p>
          </div>
        )}
        <p className="text-right text-xs text-muted">{formatDate(fb.created_at)}</p>
      </Card.Content>
    </Card>
  );
}

export default function FeedbackPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMyFeedback();
  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const submit = useSubmitFeedback();
  const [content, setContent] = React.useState("");

  return (
    <div className="space-y-4">

      <Card>
        <Card.Content className="gap-3">
          {submit.isError && <ApiErrorAlert error={submit.error} />}
          {submit.isSuccess && <SuccessAlert title={t.meFeedback.thanks} />}
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const text = content.trim();
              if (!text) return;
              submit.mutate(text, { onSuccess: () => setContent("") });
            }}
          >
            <TextField name="feedback">
              <Label>{t.meFeedback.yourFeedback}</Label>
              <TextArea
                placeholder={t.meFeedback.placeholder}
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </TextField>
            <PendingButton type="submit" variant="primary" pending={submit.isPending} isDisabled={!content.trim()}>
              {t.meFeedback.submitFeedback}
            </PendingButton>
          </form>
        </Card.Content>
      </Card>

      <StateBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={items.length === 0}
        emptyTitle={t.meFeedback.emptyTitle}
        emptyBody={t.meFeedback.emptyBody}
        onRetry={() => refetch()}
      >
        <div className="space-y-3">
          {items.map((fb) => (
            <FeedbackCard key={fb.id} fb={fb} />
          ))}
        </div>
        <LoadMore hasNextPage={hasNextPage} isFetching={isFetchingNextPage} onLoadMore={() => fetchNextPage()} />
      </StateBoundary>
    </div>
  );
}
