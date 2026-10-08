"use client";

import { Avatar, Card, Typography } from "@heroui/react";
import { ShieldBan } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { PendingButton } from "@/components/common/pending-button";
import { useBlocks, useUnblock } from "@/features/me";
import { useI18n } from "@/lib/i18n";

export default function PrivacySettingsPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useBlocks();
  const unblock = useUnblock();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card>
        <Card.Content className="gap-3">
          <Typography type="h6" className="flex items-center gap-2">
            <ShieldBan size={18} className="text-muted" /> {t.meSettings.privacy}
          </Typography>
          <p className="text-sm text-muted">{t.meSettings.privacyHint}</p>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="gap-3">
          <Typography type="h6">{t.meSettings.blockedUsers}</Typography>
          <StateBoundary
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!data || data.length === 0}
            emptyTitle={t.meSettings.noBlocked}
            skeletonRows={2}
            onRetry={() => refetch()}
          >
            <div className="flex flex-col gap-2">
              {(data ?? []).map((b) => (
                <div key={b.blocked_id} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar size="sm">
                      {b.user?.avatar_url ? (
                        <Avatar.Image src={b.user.avatar_url} alt={b.user?.name ?? "avatar"} />
                      ) : null}
                      <Avatar.Fallback>{b.user?.name?.[0] ?? "?"}</Avatar.Fallback>
                    </Avatar>
                    <span className="truncate text-sm">{b.user?.name ?? t.meSettings.unknownUser}</span>
                  </div>
                  <PendingButton
                    size="sm"
                    variant="tertiary"
                    pending={unblock.isPending}
                    onPress={() => unblock.mutate(b.blocked_id)}
                  >
                    {t.meSettings.unblock}
                  </PendingButton>
                </div>
              ))}
            </div>
          </StateBoundary>
        </Card.Content>
      </Card>
    </div>
  );
}
