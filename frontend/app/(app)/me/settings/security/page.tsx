"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  Typography,
} from "@heroui/react";
import { KeyRound, Trash2 } from "lucide-react";
import { ApiErrorAlert, SuccessAlert } from "@/components/common/alerts";
import { ConfirmButton } from "@/components/common/confirm-button";
import { PendingButton } from "@/components/common/pending-button";
import { useChangePassword } from "@/features/auth";
import { useDeleteAccount } from "@/features/me";
import { useI18n } from "@/lib/i18n";

function ChangePasswordCard() {
  const { t } = useI18n();
  const change = useChangePassword();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ current_password: "", new_password: "", confirm: "" });
  const mismatch = form.confirm.length > 0 && form.new_password !== form.confirm;

  const submit = (close: () => void) => {
    if (mismatch) return;
    change.mutate(
      { current_password: form.current_password, new_password: form.new_password },
      {
        onSuccess: () => {
          setForm({ current_password: "", new_password: "", confirm: "" });
          setOpen(false);
          close();
        },
      },
    );
  };

  return (
    <Card>
      <Card.Content className="flex-row items-center gap-3">
        <div className="min-w-0 flex-1">
          <Typography type="h6">{t.meSettings.changePassword}</Typography>
          <Typography type="body-xs" color="muted">{t.meSettings.passwordSubtitle}</Typography>
        </div>
        <Button size="sm" variant="secondary" onPress={() => setOpen(true)}>
          <KeyRound size={14} /> {t.meSettings.changePassword}
        </Button>
      </Card.Content>
      <Modal>
        <Modal.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable>
          <Modal.Container size="sm">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading className="text-base font-semibold">{t.meSettings.changePassword}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-3">
                    {change.isError && <ApiErrorAlert error={change.error} />}
                    {change.isSuccess && <SuccessAlert title={t.meSettings.passwordUpdated} />}
                    <TextField name="current_password" type="password">
                      <Label>{t.meSettings.currentPassword}</Label>
                      <Input value={form.current_password} onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))} />
                    </TextField>
                    <TextField name="new_password" type="password">
                      <Label>{t.meSettings.newPassword}</Label>
                      <Input value={form.new_password} onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))} />
                    </TextField>
                    <TextField name="confirm" type="password" isInvalid={mismatch}>
                      <Label>{t.meSettings.confirmNewPassword}</Label>
                      <Input value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
                      {mismatch && <FieldError>{t.meSettings.passwordsMismatch}</FieldError>}
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="tertiary" onPress={close}>{t.common.cancel}</Button>
                    <PendingButton
                      variant="primary"
                      pending={change.isPending}
                      isDisabled={!form.current_password || !form.new_password || mismatch}
                      onPress={() => submit(close)}
                    >
                      {t.meSettings.updatePassword}
                    </PendingButton>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Card>
  );
}

export default function AccountSecurityPage() {
  const router = useRouter();
  const { t } = useI18n();
  const del = useDeleteAccount();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <ChangePasswordCard />

      <Card>
        <Card.Content className="flex-row items-center gap-3">
          <div className="min-w-0 flex-1">
            <Typography type="h6" className="text-danger">{t.meSettings.deleteAccount}</Typography>
            <Typography type="body-xs" color="muted">{t.meSettings.deleteAccountConfirmBody}</Typography>
          </div>
          <ConfirmButton
            title={t.meSettings.deleteAccountConfirmTitle}
            body={t.meSettings.deleteAccountConfirmBody}
            confirmLabel={t.meSettings.deleteForever}
            color="danger"
            size="md"
            isLoading={del.isPending}
            onConfirm={() => del.mutate(undefined, { onSuccess: () => router.replace("/login") })}
          >
            <span className="inline-flex items-center gap-1 text-danger">
              <Trash2 size={14} /> {t.meSettings.deleteAccount}
            </span>
          </ConfirmButton>
        </Card.Content>
      </Card>
    </div>
  );
}
