"use client";

import { Avatar, Button, Card, Typography } from "@heroui/react";
import { UserCheck, UserX } from "lucide-react";
import { useRespondConnection } from "../hooks";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/format";
import type { Connection } from "@/lib/api/types";

export function ConnectionRequestCard({ connection }: { connection: Connection }) {
  const { t } = useI18n();
  const respond = useRespondConnection();
  const other = connection.user;

  return (
    <Card>
      <Card.Content className="flex-row items-center gap-3">
        <Avatar size="md">
          {other?.avatar_url && (
            <Avatar.Image src={other.avatar_url} alt={other?.name ?? ""} />
          )}
          <Avatar.Fallback>{other?.name?.[0] ?? "?"}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Typography type="h6" truncate>{other?.name ?? t.connections.unknown}</Typography>
          <p className="truncate text-sm text-muted">{connection.message ?? t.connections.connectionRequest}</p>
          <p className="text-xs text-muted">{timeAgo(connection.created_at)}</p>
        </div>
        {connection.status === "pending" && (
          <div className="flex shrink-0 gap-2">
            <Button isIconOnly size="sm" variant="secondary" aria-label={t.connections.accept} isPending={respond.isPending} onPress={() => respond.mutate({ id: connection.id, status: "accepted" })}>
              <UserCheck size={16} />
            </Button>
            <Button isIconOnly size="sm" variant="danger-soft" aria-label={t.connections.decline} isPending={respond.isPending} onPress={() => respond.mutate({ id: connection.id, status: "declined" })}>
              <UserX size={16} />
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
