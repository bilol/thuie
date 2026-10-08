"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, Chip, Typography } from "@heroui/react";
import { MessageSquare, Pin, ThumbsUp } from "lucide-react";
import { ContentStatusChip } from "@/components/common/status-chip";
import { timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { apiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { useToggleLike } from "@/features/forum/hooks";
import type { ForumPost } from "@/lib/api/types";

export function ForumCard({ post }: { post: ForumPost }) {
  const { t } = useI18n();
  const router = useRouter();
  const like = useToggleLike();

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          {post.author && (
            <Avatar size="sm">
              {post.author.avatar_url && <Avatar.Image src={post.author.avatar_url} alt={post.author.name ?? ""} />}
              <Avatar.Fallback>{post.author.name?.[0] ?? "?"}</Avatar.Fallback>
            </Avatar>
          )}
          <Card.Title className="min-w-0 flex-1 leading-snug">
            <Link href={`/forum/${post.id}`} className="after:absolute after:inset-0 after:rounded-xl">{post.title}</Link>
          </Card.Title>
          <div className="flex shrink-0 items-center gap-2">
            {post.is_pinned && (
              <Chip size="sm" variant="primary" color="accent">
                <Pin size={12} />
                <Chip.Label>{t.forumDetail.pinned}</Chip.Label>
              </Chip>
            )}
            <ContentStatusChip status={post.status} />
          </div>
        </div>
      </Card.Header>

      <Card.Content>
        <Typography type="body-sm" color="muted" className="line-clamp-2">{post.excerpt ?? post.content}</Typography>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {post.tags?.map((tag) => (
            <Chip key={tag.id} size="sm" variant="tertiary">#{tag.name}</Chip>
          ))}
          <span className="text-xs text-muted">{timeAgo(post.created_at)}</span>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            isPending={like.isPending}
            aria-label={t.forumDetail.likeAria}
            aria-pressed={post.liked}
            className={cn("gap-1 text-xs", post.liked && "text-accent")}
            onPress={() => like.mutate(post.id)}
          >
            <ThumbsUp size={14} fill={post.liked ? "currentColor" : "none"} />
            {post.like_count}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t.forumDetail.comment}
            className="gap-1 text-xs"
            onPress={() => router.push(`/forum/${post.id}?comment=1`)}
          >
            <MessageSquare size={14} />
            {post.comment_count}
          </Button>
        </div>
        {like.isError && (
          <p className="text-xs text-danger">{apiErrorMessage(like.error)}</p>
        )}
      </Card.Content>
    </Card>
  );
}
