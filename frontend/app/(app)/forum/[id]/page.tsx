"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Avatar,
  AvatarGroup,
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
import { Bookmark, Flag, MapPin, MessageSquare, Pencil, Pin, ThumbsUp, Trash2 } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { PendingButton } from "@/components/common/pending-button";
import { ContentStatusChip } from "@/components/common/status-chip";
import { ItemActionsMenu } from "@/components/common/item-actions-menu";
import { timeAgo } from "@/lib/format";
import { useCan, useCurrentUser } from "@/lib/auth/guards";
import {
  useCommentsFeed,
  useCreateComment,
  useDeleteComment,
  useDeletePost,
  usePost,
  useToggleBookmark,
  useToggleLike,
  useUpdatePost,
} from "@/features/forum";
import { useCreateReport } from "@/features/engagement";
import { apiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { ApiErrorAlert } from "@/components/common/alerts";
import { useI18n } from "@/lib/i18n";
import type { Comment, ForumPost } from "@/lib/api/types";

function CommentRow({
  comment,
  isReplying,
  replyValue,
  replyPending,
  onReplyChange,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
}: {
  comment: Comment;
  isReplying: boolean;
  replyValue: string;
  replyPending: boolean;
  onReplyChange: (value: string) => void;
  onStartReply: (id: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const me = useCurrentUser();
  const { t } = useI18n();
  const canComment = useCan("can_comment");
  const isOwn = comment.author?.id === me?.id;
  const authorName = comment.author?.name ?? t.common.unknown;
  return (
    <div className="flex gap-3 py-3">
      <Avatar size="sm">
        {comment.author?.avatar_url ? (
          <Avatar.Image src={comment.author.avatar_url} alt={authorName} />
        ) : null}
        <Avatar.Fallback>{comment.author?.name?.[0] ?? "?"}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{authorName}</span>
          <ContentStatusChip status={comment.status} />
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
        <div className="mt-1 flex items-center gap-1">
          {canComment && (
            <Button size="sm" variant="ghost" className="px-1 text-xs" onPress={() => onStartReply(comment.id)}>
              {t.forumDetail.reply}
            </Button>
          )}
          {isOwn && (
            <Button size="sm" variant="ghost" className="px-1 text-xs text-danger" onPress={() => onDelete(comment.id)}>
              {t.common.delete}
            </Button>
          )}
          <span className={cn("text-xs text-muted", (canComment || isOwn) && "ml-1")}>{timeAgo(comment.created_at)}</span>
        </div>
        {isReplying && (
          <div className="mt-2 flex flex-col gap-2">
            <span className="text-xs text-muted">{t.forumDetail.replyTo(authorName)}</span>
            <TextField aria-label={t.forumDetail.replyTo(authorName)}>
              <TextArea autoFocus rows={2} value={replyValue} onChange={(e) => onReplyChange(e.target.value)} />
            </TextField>
            <div className="flex items-center gap-2">
              <PendingButton
                size="sm"
                variant="ghost"
                className="text-accent"
                pending={replyPending}
                isDisabled={!replyValue.trim()}
                onPress={() => onSubmitReply(comment.id)}
              >
                {t.forumDetail.comment}
              </PendingButton>
              <Button size="sm" variant="tertiary" onPress={onCancelReply}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditPost({ post, onDone }: { post: ForumPost; onDone: () => void }) {
  const update = useUpdatePost(post.id);
  const { t } = useI18n();
  const [title, setTitle] = React.useState(post.title);
  const [content, setContent] = React.useState(post.content);
  return (
    <div className="flex flex-col gap-4">
      {update.isError && <ApiErrorAlert error={update.error} />}
      <TextField name="edit-title">
        <Label>{t.common.title}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </TextField>
      <TextField name="edit-content">
        <Label>{t.common.content}</Label>
        <TextArea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
      </TextField>
      <div className="flex gap-2">
        <PendingButton
          variant="primary"
          pending={update.isPending}
          onPress={() =>
            update.mutate(
              { body: { title, content, location: post.location ?? undefined, tags: (post.tags ?? []).map((tag) => tag.slug) }, version: post.version },
              { onSuccess: onDone },
            )
          }
        >
          {t.common.save}
        </PendingButton>
        <Button variant="tertiary" onPress={onDone}>{t.common.cancel}</Button>
      </div>
    </div>
  );
}

export default function ForumDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const me = useCurrentUser();
  const { t } = useI18n();
  const canComment = useCan("can_comment");
  const post = usePost(id);
  const comments = useCommentsFeed(id);
  const addComment = useCreateComment(id);
  const delComment = useDeleteComment(id);
  const like = useToggleLike();
  const bookmark = useToggleBookmark();
  const delPost = useDeletePost();
  const report = useCreateReport();

  const [draft, setDraft] = React.useState("");
  const [parent, setParent] = React.useState<string | null>(null);
  const [replyDraft, setReplyDraft] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [reporting, setReporting] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const data = post.data;
  const isOwner = !!data?.author && data.author.id === me?.id;
  const items = comments.data?.data ?? [];
  const likers = data?.liked_by ?? [];
  const likeOverflow = data ? Math.max(0, data.like_count - likers.length) : 0;
  const likerNames = likers.map((u) => u.name).join(", ");

  const focusComment = searchParams.get("comment") === "1";
  React.useEffect(() => {
    if (!focusComment || !data) return;
    const el = document.getElementById("forum-comment-composer") ?? document.getElementById("forum-comments");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
    router.replace(`/forum/${id}`);
  }, [focusComment, data, id, router]);

  return (
    <div className="mx-auto max-w-2xl">
      <StateBoundary isLoading={post.isLoading} isError={post.isError} error={post.error} isEmpty={!data}>
        {data && (
          <div className="space-y-4">
            <Card>
              <Card.Content className="gap-4">
                <div className="flex items-center gap-3">
                  {data.author && (
                    <Avatar size="sm">
                      {data.author.avatar_url && <Avatar.Image src={data.author.avatar_url} alt={data.author.name ?? ""} />}
                      <Avatar.Fallback>{data.author.name?.[0] ?? "?"}</Avatar.Fallback>
                    </Avatar>
                  )}
                  {!editing && (
                    <Typography type="h1" weight="bold" className="min-w-0 flex-1 text-2xl">{data.title}</Typography>
                  )}
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {data.is_pinned && (
                      <Chip size="sm" variant="primary" color="accent" className="gap-1">
                        <Pin size={12} /> {t.forumDetail.pinned}
                      </Chip>
                    )}
                    {data.location && <span className="flex items-center gap-1 text-xs text-muted"><MapPin size={13} /> {data.location}</span>}
                    <ContentStatusChip status={data.status} />
                    <ItemActionsMenu
                      label={t.forumDetail.moreActions}
                      triggerVariant="ghost"
                      items={[
                        {
                          id: "bookmark",
                          label: data.bookmarked ? t.forumDetail.saved : t.forumDetail.save,
                          icon: <Bookmark size={16} fill={data.bookmarked ? "currentColor" : "none"} />,
                          onPress: () => bookmark.mutate(data.id),
                        },
                        ...(isOwner && !editing
                          ? [
                              {
                                id: "edit",
                                label: t.common.edit,
                                icon: <Pencil size={16} />,
                                onPress: () => setEditing(true),
                              },
                            ]
                          : []),
                        ...(isOwner
                          ? [
                              {
                                id: "delete",
                                label: t.common.delete,
                                icon: <Trash2 size={16} />,
                                tone: "danger" as const,
                                confirm: {
                                  title: t.forumDetail.deleteConfirmTitle,
                                  confirmLabel: t.common.delete,
                                  isLoading: delPost.isPending,
                                  onConfirm: () => delPost.mutate(data.id, { onSuccess: () => router.push("/forum") }),
                                },
                              },
                            ]
                          : []),
                        ...(!isOwner
                          ? [
                              {
                                id: "report",
                                label: t.forumDetail.report,
                                icon: <Flag size={16} />,
                                onPress: () => setReporting((v) => !v),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>

                {reporting && (
                  <div className="flex flex-wrap items-center gap-2">
                    <TextField aria-label={t.infoDetail.reasonAria} className="min-w-0 flex-1">
                      <Input placeholder={t.infoDetail.reasonAria} value={reason} onChange={(e) => setReason(e.target.value)} />
                    </TextField>
                    <PendingButton
                      size="sm"
                      variant="danger"
                      pending={report.isPending}
                      isDisabled={!reason.trim()}
                      onPress={() => report.mutate({ target_type: "forum_post", target_id: data.id, reason }, { onSuccess: () => { setReporting(false); setReason(""); } })}
                    >
                      {t.common.send}
                    </PendingButton>
                    <Button size="sm" variant="tertiary" onPress={() => { setReporting(false); setReason(""); }}>
                      {t.common.cancel}
                    </Button>
                  </div>
                )}

                {editing ? (
                  <EditPost post={data} onDone={() => setEditing(false)} />
                ) : (
                  <>
                    <p className="prose-body">{data.content}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {data.tags?.map((tag) => (
                        <Chip key={tag.id} size="sm" variant="tertiary">#{tag.name}</Chip>
                      ))}
                      <span className="text-xs text-muted">{timeAgo(data.created_at)}</span>
                    </div>
                  </>
                )}

                {!editing && (
                  <>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" isPending={like.isPending} aria-label={t.forumDetail.likeAria} className={data.liked ? "text-accent" : undefined} onPress={() => like.mutate(data.id)}>
                          <ThumbsUp size={16} fill={data.liked ? "currentColor" : "none"} />
                          {data.like_count}
                        </Button>
                        {data.like_count > 0 && likers.length > 0 && (
                          <AvatarGroup
                            size="sm"
                            overlap="ring"
                            title={t.forumDetail.likedBy(likerNames)}
                            aria-label={t.forumDetail.likedBy(likerNames)}
                          >
                            {likers.map((u) => (
                              <Avatar key={u.id}>
                                {u.avatar_url ? <Avatar.Image src={u.avatar_url} alt={u.name} /> : null}
                                <Avatar.Fallback>{u.name?.[0] ?? "?"}</Avatar.Fallback>
                              </Avatar>
                            ))}
                            {likeOverflow > 0 && <AvatarGroup.Count>+{likeOverflow}</AvatarGroup.Count>}
                          </AvatarGroup>
                        )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t.forumDetail.comment}
                          onPress={() => {
                            const el = document.getElementById("forum-comment-composer") ?? document.getElementById("forum-comments");
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                            el?.focus();
                          }}
                        >
                          <MessageSquare size={16} />
                          {data.comment_count}
                        </Button>
                      </div>
                    </div>
                    {(like.isError || bookmark.isError) && (
                      <p className="text-sm text-danger">{apiErrorMessage(like.error ?? bookmark.error)}</p>
                    )}
                  </>
                )}

                <StateBoundary isLoading={comments.isLoading} isError={comments.isError} error={comments.error} skeletonRows={2}>
                  <div>
                    {items.map((c) => (
                      <CommentRow
                        key={c.id}
                        comment={c}
                        isReplying={parent === c.id}
                        replyValue={replyDraft}
                        replyPending={addComment.isPending}
                        onReplyChange={setReplyDraft}
                        onStartReply={(cid) => {
                          setParent(cid);
                          setReplyDraft("");
                        }}
                        onCancelReply={() => {
                          setParent(null);
                          setReplyDraft("");
                        }}
                        onSubmitReply={(cid) =>
                          addComment.mutate(
                            { content: replyDraft, parent_id: cid },
                            {
                              onSuccess: () => {
                                setParent(null);
                                setReplyDraft("");
                              },
                            },
                          )
                        }
                        onDelete={(cid) => delComment.mutate(cid)}
                      />
                    ))}
                  </div>
                </StateBoundary>
                <Separator />
                {canComment ? (
                  <div className="flex items-center gap-2">
                    <textarea
                      id="forum-comment-composer"
                      aria-label={t.forumDetail.addCommentAria}
                      placeholder={t.forumDetail.addCommentAria}
                      rows={1}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="min-w-0 flex-1 resize-none border-0 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted"
                    />
                    <PendingButton
                      size="sm"
                      variant="ghost"
                      className="text-accent"
                      pending={addComment.isPending}
                      isDisabled={!draft.trim()}
                      onPress={() =>
                        addComment.mutate({ content: draft, parent_id: null }, { onSuccess: () => setDraft("") })
                      }
                    >
                      {t.forumDetail.comment}
                    </PendingButton>
                  </div>
                ) : (
                  <p id="forum-comments" className="text-sm text-muted">{t.forumDetail.cannotComment}</p>
                )}
              </Card.Content>
            </Card>
          </div>
        )}
      </StateBoundary>
    </div>
  );
}
