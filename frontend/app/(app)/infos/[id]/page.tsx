"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Input,
  Label,
  Separator,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { Flag, Pencil, Pin, Star, Trash2 } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { PendingButton } from "@/components/common/pending-button";
import { ContentStatusChip } from "@/components/common/status-chip";
import { ItemActionsMenu } from "@/components/common/item-actions-menu";
import { VerifiedBadge } from "@/components/common/author";
import { ConfirmButton } from "@/components/common/confirm-button";
import { timeAgo } from "@/lib/format";
import { useCurrentUser } from "@/lib/auth/guards";
import { useDeleteInfo, useInfo, useReportInfo, useUpdateInfo } from "@/features/infos";
import { useFavoriteStatus, useToggleFavorite } from "@/features/engagement";
import { ApiErrorAlert } from "@/components/common/alerts";
import { useI18n } from "@/lib/i18n";
import type { InfoPost } from "@/lib/api/types";

function EditForm({ info, onDone }: { info: InfoPost; onDone: () => void }) {
  const update = useUpdateInfo(info.id);
  const { t } = useI18n();
  const [title, setTitle] = React.useState(info.title);
  const [content, setContent] = React.useState(info.content);

  return (
    <div className="flex flex-col gap-4">
      {update.isError && <ApiErrorAlert error={update.error} />}
      <TextField name="edit-title">
        <Label>{t.common.title}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </TextField>
      <TextField name="edit-content">
        <Label>{t.common.content}</Label>
        <TextArea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
      </TextField>
      <div className="flex gap-2">
        <PendingButton
          variant="primary"
          pending={update.isPending}
          isDisabled={!title.trim() || !content.trim()}
          onPress={() =>
            update.mutate(
              { body: { title, content, category: info.category, visibility: info.visibility }, version: info.version },
              { onSuccess: onDone },
            )
          }
        >
          {t.infoDetail.saveResubmit}
        </PendingButton>
        <Button variant="tertiary" onPress={onDone}>
          {t.common.cancel}
        </Button>
      </div>
      <p className="text-xs text-muted">{t.infoDetail.editHint}</p>
    </div>
  );
}

export default function InfoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const me = useCurrentUser();
  const { t } = useI18n();
  const info = useInfo(id);
  const report = useReportInfo();
  const favorite = useToggleFavorite();
  const saved = useFavoriteStatus("info", id);
  const remove = useDeleteInfo();
  const [editing, setEditing] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [showReport, setShowReport] = React.useState(false);

  const post = info.data;
  const isOwner = !!post?.author && post.author.id === me?.id;
  const isSaved = !!saved.data?.favorited;

  return (
    <div className="mx-auto max-w-2xl">
      <StateBoundary isLoading={info.isLoading} isError={info.isError} error={info.error} isEmpty={!post}>
        {post && (
          <Card>
            <Card.Content className="gap-4">
              <div className="flex items-center gap-3">
                {!editing && (
                  <>
                    {post.author ? (
                      <Avatar size="sm">
                        {post.author.avatar_url && <Avatar.Image src={post.author.avatar_url} alt={post.author.name ?? ""} />}
                        <Avatar.Fallback>{post.author.name?.[0] ?? "?"}</Avatar.Fallback>
                      </Avatar>
                    ) : (
                      post.source === "official" && <VerifiedBadge />
                    )}
                    <Typography type="h1" weight="bold" className="min-w-0 flex-1 text-2xl">{post.title}</Typography>
                  </>
                )}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {post.pinned && (
                    <Chip size="sm" variant="primary" color="accent">
                      <Pin size={12} />
                      <Chip.Label>{t.infoDetail.pinned}</Chip.Label>
                    </Chip>
                  )}
                  <ContentStatusChip status={post.status} />
                  <ItemActionsMenu
                    label={t.infoDetail.moreActions}
                    triggerVariant="ghost"
                    items={[
                      {
                        id: "save",
                        label: isSaved ? t.infoDetail.favorited : t.infoDetail.favorite,
                        icon: <Star size={16} fill={isSaved ? "currentColor" : "none"} />,
                        onPress: () => favorite.mutate({ target_type: "info", target_id: post.id, saved: isSaved }),
                      },
                      ...(!isOwner
                        ? [
                            {
                              id: "report",
                              label: t.infoDetail.report,
                              icon: <Flag size={16} />,
                              onPress: () => setShowReport((v) => !v),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>

              {showReport && (
                <div className="flex flex-wrap items-center gap-2">
                  <TextField aria-label={t.infoDetail.reasonAria} className="min-w-0 flex-1">
                    <Input placeholder={t.infoDetail.reasonAria} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </TextField>
                  <PendingButton
                    size="sm"
                    variant="danger"
                    pending={report.isPending}
                    isDisabled={!reason.trim()}
                    onPress={() =>
                      report.mutate(
                        { id: post.id, reason },
                        { onSuccess: () => { setShowReport(false); setReason(""); } },
                      )
                    }
                  >
                    {t.common.send}
                  </PendingButton>
                  <Button size="sm" variant="tertiary" onPress={() => { setShowReport(false); setReason(""); }}>
                    {t.common.cancel}
                  </Button>
                </div>
              )}

              {editing ? (
                <EditForm info={post} onDone={() => setEditing(false)} />
              ) : (
                <>
                  <p className="prose-body">{post.content}</p>

                  {post.media && post.media.length > 0 && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {post.media.map((m) =>
                          m.kind === "image" ? (
                            <img key={m.id} src={m.url} alt={m.file_name} className="aspect-square w-full rounded-lg object-cover" />
                          ) : (
                            <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
                              {m.file_name}
                            </a>
                          ),
                        )}
                      </div>
                    </>
                  )}

                  <span className="text-xs text-muted">{timeAgo(post.created_at)}</span>
                  <Chip size="sm" variant="primary" color="accent">{t.infos.tabs[post.category] ?? post.category}</Chip>
                </>
              )}

              {!editing && isOwner && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onPress={() => setEditing(true)}>
                    <Pencil size={16} />
                    {t.common.edit}
                  </Button>
                  <ConfirmButton
                    title={t.infoDetail.deleteConfirmTitle}
                    body={t.infoDetail.deleteConfirmBody}
                    confirmLabel={t.common.delete}
                    isLoading={remove.isPending}
                    onConfirm={() => remove.mutate(post.id, { onSuccess: () => router.push("/infos") })}
                  >
                    <Trash2 size={16} /> {t.common.delete}
                  </ConfirmButton>
                </div>
              )}
            </Card.Content>
          </Card>
        )}
      </StateBoundary>
    </div>
  );
}
