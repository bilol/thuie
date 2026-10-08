"use client";

import * as React from "react";
import {
  Avatar,
  Button,
  Card,
  Modal,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { useCurrentUser } from "@/lib/auth/guards";
import { StatusChip } from "@/components/common/status-chip";
import { ApiErrorAlert } from "@/components/common/alerts";
import { PendingButton } from "@/components/common/pending-button";
import { useApplyMentorship } from "../hooks";
import { useI18n } from "@/lib/i18n";
import type { MentorProfile } from "@/lib/api/types";

export function MentorCard({ mentor }: { mentor: MentorProfile }) {
  const me = useCurrentUser();
  const { t } = useI18n();
  const apply = useApplyMentorship();
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const canApply = mentor.user && mentor.user.id !== me?.id && mentor.status === "active";

  return (
    <Card>
      <Card.Content className="flex-row items-center gap-3">
        <Avatar size="md">
          {mentor.user?.avatar_url ? (
            <Avatar.Image src={mentor.user.avatar_url} alt={mentor.user?.name ?? "avatar"} />
          ) : null}
          <Avatar.Fallback>{mentor.user?.name?.[0] ?? "?"}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Typography type="h6" truncate>{mentor.user?.name ?? t.mentorship.mentorFallback}</Typography>
            <StatusChip status={mentor.status} />
          </div>
          <p className="truncate text-sm text-muted">{mentor.expertise}</p>
          <p className="text-xs text-muted">
            {mentor.mentor_area} · {t.mentorship.mentees(mentor.current_mentees, mentor.max_mentees)}
          </p>
        </div>
        {canApply && (
          <Button size="sm" variant="secondary" onPress={() => setOpen(true)}>
            {t.mentorship.request}
          </Button>
        )}
        <Modal>
          <Modal.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable>
            <Modal.Container size="sm">
              <Modal.Dialog>
                {({ close }) => (
                  <>
                    <Modal.CloseTrigger />
                    <Modal.Header>
                      <Modal.Heading className="text-base font-semibold">{t.mentorship.requestTitle}</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body className="flex flex-col gap-3">
                      <TextField aria-label={t.mentorship.messageAria}>
                        <TextArea placeholder={t.mentorship.messagePlaceholder} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                      </TextField>
                      {apply.isError && <ApiErrorAlert error={apply.error} />}
                    </Modal.Body>
                    <Modal.Footer>
                      <Button variant="tertiary" onPress={close}>{t.common.cancel}</Button>
                      <PendingButton
                        variant="primary"
                        pending={apply.isPending}
                        isDisabled={!message.trim()}
                        onPress={() =>
                          apply.mutate(
                            { mentor_user_id: mentor.user!.id, message },
                            { onSuccess: () => { setOpen(false); setMessage(""); close(); } },
                          )
                        }
                      >
                        {t.mentorship.sendRequest}
                      </PendingButton>
                    </Modal.Footer>
                  </>
                )}
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </Card.Content>
    </Card>
  );
}
