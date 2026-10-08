"use client";

import * as React from "react";
import { Button, Card, Chip, Switch, Typography } from "@heroui/react";
import { StateBoundary } from "@/components/common/state";
import { ApiErrorAlert, SuccessAlert } from "@/components/common/alerts";
import { PendingButton } from "@/components/common/pending-button";
import { useCurrentUser } from "@/lib/auth/guards";
import { useRoleStrategies, useUpdateRoleStrategy } from "@/features/admin";
import { useI18n } from "@/lib/i18n";
import type { RoleStrategy } from "@/lib/api/types";

const PERM_KEYS: (keyof Omit<RoleStrategy, "role">)[] = [
  "can_view_info",
  "can_view_internal",
  "can_view_alumni",
  "can_view_forum",
  "can_submit_info",
  "can_post_forum",
  "can_comment",
  "can_create_profile",
];

function StrategyCard({ initial }: { initial: RoleStrategy }) {
  const { t } = useI18n();
  const [draft, setDraft] = React.useState<RoleStrategy>(initial);
  const update = useUpdateRoleStrategy();

  React.useEffect(() => setDraft(initial), [initial]);

  const dirty = PERM_KEYS.some((k) => draft[k] !== initial[k]);

  return (
    <Card>
      <Card.Content className="gap-3">
        <div className="flex items-center justify-between">
          <Typography type="h6" className="capitalize">{t.roles[draft.role] ?? draft.role.replace("_", " ")}</Typography>
          <Chip size="sm" variant="tertiary">{PERM_KEYS.filter((k) => draft[k]).length}/{PERM_KEYS.length}</Chip>
        </div>
        {update.isError && <ApiErrorAlert error={update.error} />}
        {update.isSuccess && !dirty && <SuccessAlert title={t.admin.roles.saved} />}
        <div className="grid gap-1 sm:grid-cols-2">
          {PERM_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">{t.meProfile.perms[key] ?? key}</span>
              <Switch
                size="sm"
                aria-label={t.meProfile.perms[key] ?? key}
                isSelected={draft[key]}
                onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
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
        <div className="flex gap-2">
          <PendingButton
            size="sm"
            variant="secondary"
            isDisabled={!dirty}
            pending={update.isPending}
            onPress={() => update.mutate(draft)}
          >
            {t.common.saveChanges}
          </PendingButton>
          {dirty && (
            <Button size="sm" variant="tertiary" onPress={() => setDraft(initial)}>
              {t.common.reset}
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

export default function AdminRolesPage() {
  const { t } = useI18n();
  const user = useCurrentUser();
  const { data, isLoading, isError, error, refetch } = useRoleStrategies();

  const items = data ?? [];

  if (user?.role !== "admin_super") {
    return <p className="p-8 text-center text-sm text-muted">{t.admin.roles.noAccess}</p>;
  }

  return (
    <div className="space-y-4">

      <StateBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={items.length === 0}
        emptyTitle={t.admin.roles.emptyTitle}
        onRetry={() => refetch()}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((s) => (
            <StrategyCard key={s.role} initial={s} />
          ))}
        </div>
      </StateBoundary>
    </div>
  );
}
