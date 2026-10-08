"use client";

import { Button, Card } from "@heroui/react";
import { StatusChip } from "@/components/common/status-chip";
import {
  useRespondApplication,
  useWithdrawApplication,
} from "../hooks";
import { useI18n } from "@/lib/i18n";
import type { MentorshipApplication } from "@/lib/api/types";

export function MentorshipApplicationCard({
  application,
  direction,
}: {
  application: MentorshipApplication;
  direction: "incoming" | "outgoing";
}) {
  const { t } = useI18n();
  const respond = useRespondApplication();
  const withdraw = useWithdrawApplication();

  return (
    <Card>
      <Card.Content className="gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {direction === "outgoing" ? application.mentor?.name : application.mentee?.name}
          </span>
          <StatusChip status={application.status} />
        </div>
        <p className="text-sm text-muted">{application.message}</p>
        <div className="flex gap-2">
          {direction === "incoming" && application.status === "pending" && (
            <>
              <Button size="sm" variant="primary" isPending={respond.isPending} onPress={() => respond.mutate({ id: application.id, status: "accepted" })}>{t.mentorship.accept}</Button>
              <Button size="sm" variant="danger" isPending={respond.isPending} onPress={() => respond.mutate({ id: application.id, status: "rejected" })}>{t.mentorship.reject}</Button>
            </>
          )}
          {application.status === "pending" && direction === "outgoing" && (
            <Button size="sm" variant="tertiary" isPending={withdraw.isPending} onPress={() => withdraw.mutate(application.id)}>{t.mentorship.withdraw}</Button>
          )}
          {application.status === "accepted" && (
            <Button size="sm" variant="tertiary" isPending={withdraw.isPending} onPress={() => withdraw.mutate(application.id)}>{t.mentorship.end}</Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
