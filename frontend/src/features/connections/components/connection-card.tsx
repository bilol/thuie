"use client";

import { Avatar, Button, Card, Typography } from "@heroui/react";
import { MessageCircle } from "lucide-react";
import { useStartConversation } from "@/features/messaging";
import { useRespondConnection } from "../hooks";
import { useI18n } from "@/lib/i18n";
import type { Connection } from "@/lib/api/types";

export function ConnectionCard({ connection }: { connection: Connection }) {
  const { t } = useI18n();
  const respond = useRespondConnection();
  const openChat = useStartConversation();
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
        </div>
        {other && (
          <div className="flex shrink-0 gap-2">
            <Button isIconOnly size="sm" variant="tertiary" aria-label={t.alumniDetail.message} onPress={() => openChat({ id: other.id, name: other.name, avatar_url: other.avatar_url })}>
              <MessageCircle size={16} />
            </Button>
            <Button size="sm" variant="danger-soft" isPending={respond.isPending} onPress={() => respond.mutate({ id: connection.id, status: "revoked" })}>
              {connection.status === "pending" ? t.alumniDetail.cancelRequest : t.connections.remove}
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
