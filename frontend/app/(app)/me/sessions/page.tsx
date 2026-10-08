"use client";

import * as React from "react";
import { Card, Chip } from "@heroui/react";
import { MonitorSmartphone, Smartphone, LogOut } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { ConfirmButton } from "@/components/common/confirm-button";
import { useRevokeAllSessions, useRevokeSession, useSessions } from "@/features/me";
import { formatDate, timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Session } from "@/lib/api/types";

function guessIcon(label: string | null): React.ElementType {
  const l = (label ?? "").toLowerCase();
  if (l.includes("iphone") || l.includes("android") || l.includes("mobile")) return Smartphone;
  return MonitorSmartphone;
}

function SessionRow({ session }: { session: Session }) {
  const { t } = useI18n();
  const revoke = useRevokeSession();
  const Icon = guessIcon(session.device_label);

  return (
    <Card>
      <Card.Content className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon size={20} className="shrink-0 text-muted" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{session.device_label || t.sessions.unknownDevice}</p>
              {session.current && (
                <Chip size="sm" variant="tertiary" color="success">{t.sessions.thisDevice}</Chip>
              )}
            </div>
            <p className="truncate text-xs text-muted">
              {session.ip ? `${session.ip} · ` : ""}
              {t.sessions.lastActive} {timeAgo(session.last_used_at ?? session.created_at)} · {t.sessions.added} {formatDate(session.created_at)}
            </p>
          </div>
        </div>
        {!session.current && (
          <ConfirmButton
            title={t.sessions.revokeConfirmTitle}
            body={t.sessions.revokeConfirmBody}
            confirmLabel={t.sessions.revoke}
            isLoading={revoke.isPending}
            onConfirm={() => revoke.mutate(session.id)}
          >
            {t.sessions.revoke}
          </ConfirmButton>
        )}
      </Card.Content>
    </Card>
  );
}

export default function SessionsPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useSessions();
  const revokeAll = useRevokeAllSessions();

  const others = (data ?? []).filter((s) => !s.current);

  return (
    <div className="space-y-4">
      {others.length > 0 && (
        <div className="flex justify-end">
          <ConfirmButton
            title={t.sessions.revokeAllConfirmTitle}
            body={t.sessions.revokeAllConfirmBody}
            confirmLabel={t.sessions.signOutOthers}
            color="danger"
            isLoading={revokeAll.isPending}
            onConfirm={() => revokeAll.mutate()}
          >
              <span className="inline-flex items-center gap-1">
                <LogOut size={14} /> {t.sessions.signOutOthers}
              </span>
            </ConfirmButton>
        </div>
      )}

      <StateBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data || data.length === 0}
        emptyTitle={t.sessions.emptyTitle}
        onRetry={() => refetch()}
      >
        <div className="space-y-3">
          {(data ?? []).map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </div>
      </StateBoundary>
    </div>
  );
}
