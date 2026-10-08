"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Avatar, Button, Dropdown, Input, Separator, TextField, Typography } from "@heroui/react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Flag,
  MoreVertical,
  Pin,
  PinOff,
  Send,
  Trash2,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { useCurrentUser } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { StateBoundary } from "@/components/common/state";
import { PendingButton } from "@/components/common/pending-button";
import { ApiErrorAlert } from "@/components/common/alerts";
import { useCreateReport } from "@/features/engagement";
import type { ChatMessage } from "@/lib/api/types";
import {
  useConversationSocket,
  useConversations,
  useDeleteMessage,
  useLeaveConversation,
  useMarkConversationRead,
  useMessagesFeed,
  useSendMessage,
  useUpdateConversation,
} from "@/features/messaging";

const IMAGE_URL = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|#|$)/i;

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const me = useCurrentUser();
  const { t } = useI18n();
  const feed = useMessagesFeed(id);
  const send = useSendMessage(id);
  const markRead = useMarkConversationRead(id);
  useConversationSocket(id);

  const conversations = useConversations();
  const conversation = React.useMemo(
    () => conversations.data?.pages.flatMap((p) => p.data).find((c) => c.id === id),
    [conversations.data, id],
  );
  const title = conversation
    ? conversation.kind === "group"
      ? conversation.members?.length
        ? conversation.members.map((m) => m.name).join(", ")
        : t.messages.groupChat
      : conversation.counterpart?.name ?? t.messages.you
    : t.messages.title;

  const update = useUpdateConversation();
  const leaveConv = useLeaveConversation();
  const delMessage = useDeleteMessage(id);
  const report = useCreateReport();
  const [reportTarget, setReportTarget] = React.useState<string | null>(null);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const [draft, setDraft] = React.useState("");
  const [reason, setReason] = React.useState("");

  const messages = React.useMemo(
    () => [...(feed.data?.pages.flatMap((p) => p.data) ?? [])].reverse(),
    [feed.data],
  );

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  React.useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    send.mutate({ content: draft }, { onSuccess: () => setDraft("") });
  };

  const onHeaderAction = (key: React.Key) => {
    switch (String(key)) {
      case "pin":
        update.mutate({ id, pinned: !conversation?.pinned });
        break;
      case "mute":
        update.mutate({ id, muted: !conversation?.muted });
        break;
      case "report":
        if (conversation?.counterpart) setReportTarget(conversation.counterpart.id);
        break;
      case "leave":
        leaveConv.mutate(id, { onSuccess: () => router.push("/messages") });
        break;
    }
  };

  const onMessageAction = (m: ChatMessage) => (key: React.Key) => {
    switch (String(key)) {
      case "delete":
        delMessage.mutate(m.id);
        break;
      case "report":
        if (m.sender) setReportTarget(m.sender.id);
        break;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-separator">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/messages"
            aria-label={t.conversation.back}
            className="-ml-1 inline-flex items-center rounded-lg p-1.5 text-muted transition hover:bg-accent-soft hover:text-foreground md:hidden"
          >
            <ArrowLeft size={18} />
          </Link>
          <Dropdown>
            <Dropdown.Trigger
              aria-label={t.conversation.actionsAria}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
            >
              <Avatar size="sm">
                {conversation?.counterpart?.avatar_url && (
                  <Avatar.Image src={conversation.counterpart.avatar_url} alt={title} />
                )}
                <Avatar.Fallback>{title?.[0] ?? "?"}</Avatar.Fallback>
              </Avatar>
              <Typography type="body-sm" weight="semibold" truncate>{title}</Typography>
              {conversation?.pinned && <Pin size={13} className="shrink-0 text-accent" />}
              <MoreVertical size={16} className="ml-auto shrink-0 text-muted" />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end" className="min-w-52">
              <Dropdown.Menu aria-label={t.conversation.actionsAria} onAction={onHeaderAction}>
                <Dropdown.Item id="pin" textValue={conversation?.pinned ? t.conversation.unpin : t.conversation.pin}>
                  {conversation?.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  {conversation?.pinned ? t.conversation.unpin : t.conversation.pin}
                </Dropdown.Item>
                <Dropdown.Item id="mute" textValue={conversation?.muted ? t.conversation.unmute : t.conversation.mute}>
                  {conversation?.muted ? <Bell size={16} /> : <BellOff size={16} />}
                  {conversation?.muted ? t.conversation.unmute : t.conversation.mute}
                </Dropdown.Item>
                {conversation?.kind === "direct" && conversation.counterpart && (
                  <Dropdown.Item id="report" textValue={t.conversation.report}>
                    <Flag size={16} />
                    {t.conversation.report}
                  </Dropdown.Item>
                )}
                <Separator />
                <Dropdown.Item id="leave" textValue={t.conversation.leave} className="text-danger">
                  <UserX size={16} />
                  {t.conversation.leave}
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
        {reportTarget && (
          <div className="flex flex-col gap-2 border-t border-separator px-3 py-2">
            {report.isError && <ApiErrorAlert error={report.error} />}
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
                    { target_type: "user", target_id: reportTarget, reason },
                    { onSuccess: () => { setReportTarget(null); setReason(""); } },
                  )
                }
              >
                {t.common.send}
              </PendingButton>
              <Button size="sm" variant="tertiary" onPress={() => { setReportTarget(null); setReason(""); }}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <StateBoundary
          isLoading={feed.isLoading}
          isError={feed.isError}
          error={feed.error}
          isEmpty={messages.length === 0}
          emptyTitle={t.conversation.emptyTitle}
          skeletonRows={3}
        >
          {messages.map((m) => {
            const mine = m.sender?.id === me?.id;
            const isGroup = conversation?.kind === "group";
            const canReport = !mine && !!m.sender && !m.deleted;
            const canDelete = mine && !m.deleted;
            return (
              <div key={m.id} className={cn("group/msg flex items-end gap-1", mine ? "justify-end" : "justify-start")}>
                {!mine && (
                  <Avatar size="sm">
                    {m.sender?.avatar_url && <Avatar.Image src={m.sender.avatar_url} alt={m.sender?.name ?? ""} />}
                    <Avatar.Fallback>{m.sender?.name?.[0] ?? "?"}</Avatar.Fallback>
                  </Avatar>
                )}
                <div className="flex max-w-[75%] flex-col items-start gap-1">
                  {!mine && isGroup && m.sender?.name && (
                    <span className="px-1 text-[11px] font-medium text-muted">{m.sender.name}</span>
                  )}
                  <div className={cn("rounded-lg px-3 py-2", mine ? "bg-accent text-white" : "bg-surface-secondary")}>
                    {m.deleted ? (
                      <p className="text-sm italic opacity-70">{t.messages.deletedMessage}</p>
                    ) : (
                      <>
                        {m.content && <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
                        {m.media_url &&
                          (IMAGE_URL.test(m.media_url) ? (
                            <img src={m.media_url} alt={t.messages.attachment} className="mt-2 max-h-48 rounded-lg" />
                          ) : (
                            <a href={m.media_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">
                              {t.messages.attachment}
                            </a>
                          ))}
                      </>
                    )}
                    <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted")}>{formatDateTime(m.sent_at)}</p>
                  </div>
                </div>
                {(canDelete || canReport) && (
                  <Dropdown>
                    <Dropdown.Trigger
                      aria-label={t.conversation.messageActions}
                      className="rounded-lg p-1 text-muted opacity-0 transition group-hover/msg:opacity-100 focus-visible:opacity-100"
                    >
                      <MoreVertical size={14} />
                    </Dropdown.Trigger>
                    <Dropdown.Popover placement={mine ? "bottom start" : "bottom end"} className="min-w-40">
                      <Dropdown.Menu aria-label={t.conversation.messageActions} onAction={onMessageAction(m)}>
                        {canDelete && (
                          <Dropdown.Item id="delete" textValue={t.conversation.delete} className="text-danger">
                            <Trash2 size={15} />
                            {t.conversation.delete}
                          </Dropdown.Item>
                        )}
                        {canReport && (
                          <Dropdown.Item id="report" textValue={t.conversation.report}>
                            <Flag size={15} />
                            {t.conversation.report}
                          </Dropdown.Item>
                        )}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </StateBoundary>
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-separator p-3">
        <TextField aria-label={t.conversation.inputAria} className="flex-1">
          <Input placeholder={t.conversation.inputPlaceholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </TextField>
        <Button type="submit" isIconOnly variant="primary" aria-label={t.common.send} isPending={send.isPending} isDisabled={!draft.trim()}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
