"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Avatar, Button, Card } from "@heroui/react";
import { MessageCircle, UserCheck, UserPlus, UserX } from "lucide-react";
import { ContentStatusChip } from "@/components/common/status-chip";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/auth/guards";
import { toastError } from "@/lib/feedback";
import { useConnectionPair } from "@/features/connections";
import { useStartConversation } from "@/features/messaging";
import type { AlumniProfile } from "@/lib/api/types";

export function AlumniCard({ profile }: { profile: AlumniProfile }) {
  const { t } = useI18n();
  const me = useCurrentUser();
  const { pair, sendError, actError, sending, busyWith, sendRequest, withdraw, accept } =
    useConnectionPair(profile.connection_status);
  const openChat = useStartConversation();
  const actionable = !!profile.user_id && profile.user_id !== me?.id;
  const connId = profile.connection_id ?? null;
  useEffect(() => {
    if (sendError) toastError(sendError);
  }, [sendError]);
  useEffect(() => {
    if (actError) toastError(actError);
  }, [actError]);
  return (
    <Card className="min-w-0">
      <Card.Header>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar size="md" className="rounded-full">
              {profile.avatar_url && (
                <Avatar.Image src={profile.avatar_url} alt={profile.display_name ?? ""} />
              )}
              <Avatar.Fallback>{profile.display_name?.[0] ?? "?"}</Avatar.Fallback>
            </Avatar>
            {/* Presence dot: linked accounts always show it (green online / grey
                offline); official SCHOOL-source profiles have no account, so none. */}
            {profile.user_id && (
              <span
                aria-label={profile.is_online ? t.alumni.online : t.alumni.offline}
                title={profile.is_online ? t.alumni.online : t.alumni.offline}
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                  profile.is_online ? "bg-success" : "bg-separator"
                }`}
              />
            )}
          </div>
          <Card.Title className="min-w-0 flex-1 leading-snug">
            <Link href={`/alumni/${profile.id}`} className="after:absolute after:inset-0 after:rounded-xl">{profile.display_name}</Link>
          </Card.Title>
          <ContentStatusChip status={profile.status} />
          {actionable && (
            <div className="relative z-10 flex shrink-0 items-center gap-1">
              {!pair && (
                <Button
                  isIconOnly
                  size="sm"
                  variant={sendError ? "danger-soft" : "ghost"}
                  aria-label={t.alumniDetail.connect}
                  isPending={sending}
                  onPress={() => sendRequest({ to_user_id: profile.user_id! })}
                >
                  <UserPlus size={16} />
                </Button>
              )}
              {pair === "sent" && connId && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="danger-soft"
                  aria-label={t.alumniDetail.cancelRequest}
                  isPending={busyWith("revoked")}
                  onPress={() => withdraw(connId)}
                >
                  <UserX size={16} />
                </Button>
              )}
              {pair === "incoming" && connId && (
                <Button
                  isIconOnly
                  size="sm"
                  variant={actError ? "danger-soft" : "primary"}
                  aria-label={t.connections.accept}
                  isPending={busyWith("accepted")}
                  onPress={() => accept(connId)}
                >
                  <UserCheck size={16} />
                </Button>
              )}
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t.alumniDetail.message}
                onPress={() =>
                  openChat({
                    id: profile.user_id!,
                    name: profile.display_name,
                    avatar_url: profile.avatar_url,
                  })
                }
              >
                <MessageCircle size={16} />
              </Button>
            </div>
          )}
        </div>
      </Card.Header>
      <Card.Content className="gap-1">
        <Card.Description>
          {[profile.program, profile.graduation_year ? `${t.alumniDetail.classOf} ${profile.graduation_year}` : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </Card.Description>
        <Card.Description>
          {[profile.work_title, profile.company].filter(Boolean).join(" · ") || "—"}
        </Card.Description>
      </Card.Content>
    </Card>
  );
}
