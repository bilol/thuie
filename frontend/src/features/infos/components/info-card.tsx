"use client";

import Link from "next/link";
import { Avatar, Card, Chip, Typography } from "@heroui/react";
import { Pin } from "lucide-react";
import { ContentStatusChip } from "@/components/common/status-chip";
import { timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { InfoPost } from "@/lib/api/types";

export function InfoCard({ info }: { info: InfoPost }) {
  const { t } = useI18n();
  return (
    <Card className="min-w-0">
      <Card.Header>
        <div className="flex items-center gap-2">
          {info.author && (
            <Avatar size="sm">
              {info.author.avatar_url && <Avatar.Image src={info.author.avatar_url} alt={info.author.name ?? ""} />}
              <Avatar.Fallback>{info.author.name?.[0] ?? "?"}</Avatar.Fallback>
            </Avatar>
          )}
          <Card.Title className="min-w-0 flex-1 leading-snug">
            <Link href={`/infos/${info.id}`} className="after:absolute after:inset-0 after:rounded-xl">{info.title}</Link>
          </Card.Title>
          <div className="flex shrink-0 items-center gap-2">
            {info.pinned && (
              <Chip size="sm" variant="primary" color="accent">
                <Pin size={12} />
                <Chip.Label>{t.infoDetail.pinned}</Chip.Label>
              </Chip>
            )}
            <ContentStatusChip status={info.status} />
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <Typography type="body-sm" color="muted" className="line-clamp-2">{info.content}</Typography>
      </Card.Content>
      <Card.Footer className="flex-col items-start gap-1">
        <span className="text-xs text-muted">{timeAgo(info.created_at)}</span>
        <Chip size="sm" variant="primary" color="accent">{t.infos.tabs[info.category] ?? info.category}</Chip>
      </Card.Footer>
    </Card>
  );
}
