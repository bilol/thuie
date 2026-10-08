"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Modal,
  Typography,
} from "@heroui/react";
import { BadgeCheck, CircleAlert, Info, Pencil, ShieldCheck } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { RoleChip } from "@/components/common/status-chip";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useMe, useRoleStrategy } from "@/features/me";
import type { RoleStrategy } from "@/lib/api/types";

const PERM_KEYS: (keyof RoleStrategy)[] = [
  "can_view_info",
  "can_view_internal",
  "can_view_alumni",
  "can_view_forum",
  "can_submit_info",
  "can_post_forum",
  "can_comment",
  "can_create_profile",
];

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 text-right break-all text-foreground">{value}</span>
    </div>
  );
}

/**
 * Read-only account summary card on the /me hub. Editing lives on its own page
 * (/me/edit) via EditProfileForm, keeping this view focused on display only —
 * consistent with /me/alumni being a separate editor page.
 */
export function AccountTab() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: me, isLoading, isError, error, refetch } = useMe();
  const { data: strategy } = useRoleStrategy();
  const [permOpen, setPermOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);

  return (
    <StateBoundary isLoading={isLoading} isError={isError} error={error} isEmpty={!me} onRetry={() => refetch()}>
      {me && (
        <div className="space-y-4">
          <Card>
            <Card.Content className="gap-4">
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  {me.avatar_url ? <Avatar.Image src={me.avatar_url} alt={me.name ?? "avatar"} /> : null}
                  <Avatar.Fallback>{me.name?.[0] ?? "?"}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography type="h1" weight="bold" className="text-xl">{me.name}</Typography>
                    <RoleChip role={me.role} />
                  </div>
                  {(me.program || me.grade_year) && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                      {me.program && <span>{me.program}</span>}
                      {me.grade_year && <span>{me.grade_year}</span>}
                    </div>
                  )}
                  <p className="mt-1 text-sm text-muted">{me.bio || t.meProfile.noBio}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="tertiary"
                    aria-label={t.meProfile.info}
                    onPress={() => setInfoOpen(true)}
                  >
                    <Info size={16} />
                  </Button>
                  {strategy && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="tertiary"
                      aria-label={t.meProfile.yourPermissions}
                      onPress={() => setPermOpen(true)}
                    >
                      <ShieldCheck size={16} />
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onPress={() => router.push("/me/edit")}>
                    <Pencil size={16} />
                    {t.common.edit}
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Modal>
            <Modal.Backdrop isOpen={infoOpen} onOpenChange={setInfoOpen} isDismissable>
              <Modal.Container size="sm">
                <Modal.Dialog>
                  {() => (
                    <>
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading className="text-base font-semibold">{t.meProfile.info}</Modal.Heading>
                      </Modal.Header>
                      <Modal.Body className="flex flex-col gap-1">
                        <Row label={t.meProfile.graduationYear} value={me.graduation_year} />
                        <Row label={t.meProfile.studentId} value={me.student_id} />
                        <Row
                          label={t.meProfile.email}
                          value={
                            me.email && (
                              <span className="inline-flex flex-wrap items-center justify-end gap-1">
                                {me.email}
                                {me.email_verified_at ? (
                                  <Chip size="sm" variant="tertiary" color="success" title={formatDate(me.email_verified_at)}>
                                    <BadgeCheck size={12} />
                                    {t.meProfile.verified}
                                  </Chip>
                                ) : (
                                  <Chip size="sm" variant="tertiary" color="warning">
                                    <CircleAlert size={12} />
                                    {t.statuses.unverified}
                                  </Chip>
                                )}
                              </span>
                            )
                          }
                        />
                        <Row label={t.meProfile.phone} value={me.phone} />
                      </Modal.Body>
                    </>
                  )}
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>

          {strategy && (
            <Modal>
              <Modal.Backdrop isOpen={permOpen} onOpenChange={setPermOpen} isDismissable>
                <Modal.Container size="sm">
                  <Modal.Dialog>
                    {() => (
                      <>
                        <Modal.CloseTrigger />
                        <Modal.Header>
                          <Modal.Heading className="text-base font-semibold">{t.meProfile.yourPermissions}</Modal.Heading>
                        </Modal.Header>
                        <Modal.Body className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            {PERM_KEYS.map((key) => (
                              <Chip key={key} size="sm" variant="tertiary" color={strategy[key] ? "success" : "default"}>
                                {strategy[key] ? "✓" : "✕"} {t.meProfile.perms[key] ?? key}
                              </Chip>
                            ))}
                          </div>
                        </Modal.Body>
                      </>
                    )}
                  </Modal.Dialog>
                </Modal.Container>
              </Modal.Backdrop>
            </Modal>
          )}
        </div>
      )}
    </StateBoundary>
  );
}
