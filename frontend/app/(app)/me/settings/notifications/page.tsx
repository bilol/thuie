"use client";

import * as React from "react";
import { Card, Switch, Typography } from "@heroui/react";
import { StateBoundary } from "@/components/common/state";
import { ApiErrorAlert } from "@/components/common/alerts";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/features/me";
import { useI18n } from "@/lib/i18n";

export default function NotificationSettingsPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <Card.Content className="gap-3">
          <Typography type="h6">{t.meSettings.notifications}</Typography>
          {update.isError && <ApiErrorAlert error={update.error} />}
          <StateBoundary isLoading={isLoading} isError={isError} error={error} skeletonRows={3}>
            {data && (
              <div className="flex flex-col gap-1">
                {data.map((p) => (
                  <div key={p.type} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-foreground">{t.meSettings.notifLabels[p.type] ?? p.type}</span>
                    <Switch
                      size="sm"
                      aria-label={t.meSettings.notifLabels[p.type] ?? p.type}
                      isSelected={!p.muted}
                      onChange={(v) => update.mutate({ type: p.type, muted: !v })}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                  </div>
                ))}
              </div>
            )}
          </StateBoundary>
        </Card.Content>
      </Card>
    </div>
  );
}
