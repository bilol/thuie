"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar, Button, Card, Chip, Typography } from "@heroui/react";
import { CheckCheck, UserPlus, MessageCircle, Bell } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { LoadMore } from "@/components/common/load-more";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotificationsFeed,
} from "@/features/notifications";
import type { NotificationType } from "@/lib/api/types";

export default function NotificationsPage() {
  const { t } = useI18n();
  const feed = useNotificationsFeed();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-2xl">
      {unread > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <Chip size="sm" variant="primary" color="accent">{t.notifications.unreadCount(unread)}</Chip>
          <Button size="sm" variant="tertiary" isPending={markAll.isPending} onPress={() => markAll.mutate()}>
            <CheckCheck size={16} />
            {t.notifications.markAllRead}
          </Button>
        </div>
      )}

      <StateBoundary
        isLoading={feed.isLoading}
        isError={feed.isError}
        error={feed.error}
        isEmpty={items.length === 0}
        onRetry={() => feed.refetch()}
        emptyTitle={t.notifications.caughtUp}
      >
        <div className="grid gap-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={cn(!n.read_at && "border-accent/40")}
            >
              <Card.Content className="flex-row items-start gap-3">
                <Avatar size="md" className="shrink-0">
                  {n.payload?.actor?.avatar_url ? (
                    <Avatar.Image src={n.payload.actor.avatar_url} alt={n.payload.actor.name} />
                  ) : null}
                  <Avatar.Fallback className={cn(!n.payload?.actor && "bg-default text-muted")}>
                    {n.payload?.actor
                      ? n.payload.actor.name?.[0] ?? "?"
                      : n.type === "connection" ? <UserPlus size={16} />
                      : n.type === "comment_reply" ? <MessageCircle size={16} />
                      : <Bell size={16} />}
                  </Avatar.Fallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">
                      {t.notifications.types[n.type as NotificationType] ?? n.type}
                    </span>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </div>
                  <Typography type="body-sm" weight="semibold">{n.title}</Typography>
                  <p className="text-sm text-muted">{n.body}</p>
                  <p className="text-right text-xs text-muted">{timeAgo(n.created_at)}</p>
                </div>
              </Card.Content>
              <Link
                href={n.payload?.route ?? "/notifications"}
                onClick={() => {
                  if (!n.read_at) markRead.mutate(n.id);
                }}
                aria-label={n.title}
                className="rounded-[inherit] after:absolute after:inset-0"
              />
            </Card>
          ))}
        </div>
        <LoadMore hasNextPage={feed.hasNextPage} isFetching={feed.isFetchingNextPage} onLoadMore={() => feed.fetchNextPage()} />
      </StateBoundary>
    </div>
  );
}
