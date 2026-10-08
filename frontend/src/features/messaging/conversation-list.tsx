"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Badge, Button, Typography } from "@heroui/react";
import { Mail, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { useConversations } from "@/features/messaging";
import { timeAgo } from "@/lib/format";
import type { Conversation } from "@/lib/api/types";

export function ConversationList() {
  const me = useCurrentUser();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname.split("/")[2];

  const { data, isLoading, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useConversations();

  const sorted = React.useMemo(() => {
    const list = [...(data?.pages.flatMap((p) => p.data) ?? [])];
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "");
    });
  }, [data]);

  const titleOf = (c: Conversation) =>
    c.kind === "group"
      ? c.members?.length
        ? c.members.map((m) => m.name).join(", ")
        : t.messages.groupChat
      : c.counterpart?.name ?? t.messages.you;

  const previewOf = (c: Conversation) => {
    const lm = c.last_message;
    if (!lm) return t.messages.messageKind(c.kind);
    if (lm.deleted) return t.messages.deletedMessage;
    const text = lm.content ?? t.messages.attachment;
    return lm.sender_id && lm.sender_id === me?.id ? t.messages.youSaid(text) : text;
  };

  return (
    <>
      <div className="shrink-0 border-b border-separator px-4 py-3">
        <Typography type="h6">{t.messages.title}</Typography>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <StateBoundary
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={sorted.length === 0}
          onRetry={() => refetch()}
          emptyIcon={<Mail size={22} />}
          emptyTitle={t.messages.noConversations}
          emptyBody={t.messages.emptyHint}
          emptyAction={
            <Button variant="primary" onPress={() => router.push("/alumni")}>
              <Users size={16} />
              {t.messages.browseAlumni}
            </Button>
          }
        >
          <nav className="flex-1 overflow-y-auto p-1.5">
            {sorted.map((c) => {
              const title = titleOf(c);
              const avatarUrl = c.counterpart?.avatar_url ?? undefined;
              const active = c.id === activeId;
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2 transition",
                    active ? "bg-accent/10" : "hover:bg-accent-soft",
                  )}
                >
                  <Badge.Anchor>
                    <Avatar size="md">
                      {avatarUrl && <Avatar.Image src={avatarUrl} alt={title} />}
                      <Avatar.Fallback>{title?.[0] ?? "?"}</Avatar.Fallback>
                    </Avatar>
                    {!!c.unread_count && <Badge color="danger">{c.unread_count}</Badge>}
                  </Badge.Anchor>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Typography type="body-sm" weight={active ? "semibold" : "medium"} className={cn("truncate", active && "text-accent")}>
                        {title}
                      </Typography>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(c.last_message_at)}</span>
                    </div>
                    <p className={cn("truncate text-sm", active ? "text-foreground" : "text-muted")}>
                      {previewOf(c)}
                    </p>
                  </div>
                </Link>
              );
            })}
            <LoadMore hasNextPage={hasNextPage} isFetching={isFetchingNextPage} onLoadMore={() => fetchNextPage()} />
          </nav>
        </StateBoundary>
      </div>
    </>
  );
}
