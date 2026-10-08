"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { ApiErrorAlert } from "@/components/common/alerts";
import { useI18n } from "@/lib/i18n";
import { useReset } from "@/features/auth";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const reset = useReset();
  const { t } = useI18n();
  const [identifier, setIdentifier] = React.useState(params.get("identifier") ?? "");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const badPassword = newPassword.length > 0 && !PASSWORD_RULE.test(newPassword);

  return (
    <Card>
      <Card.Content className="gap-4">
        <div>
          <Typography type="h1" weight="bold" className="text-xl">{t.auth.reset.title}</Typography>
          <p className="text-sm text-muted">
            {t.auth.reset.subtitle}
          </p>
        </div>

        {reset.isError && <ApiErrorAlert error={reset.error} />}

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            reset.mutate(
              { identifier, code, new_password: newPassword },
              { onSuccess: () => router.replace("/login") },
            );
          }}
        >
          <TextField name="identifier">
            <Label>{t.auth.handle}</Label>
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </TextField>
          <TextField name="code">
            <Label>{t.auth.reset.code}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </TextField>
          <TextField name="new_password" type="password" isInvalid={badPassword}>
            <Label>{t.auth.reset.newPassword}</Label>
            <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <FieldError>{t.auth.passwordRule}</FieldError>
          </TextField>
          <PendingButton
            type="submit"
            variant="primary"
            pending={reset.isPending}
            isDisabled={badPassword}
            fullWidth
          >
            {t.auth.reset.update}
          </PendingButton>
        </form>

        <p className="text-center text-sm">
          <Link href="/login" className="text-accent hover:underline">
            {t.auth.backToSignIn}
          </Link>
        </p>
      </Card.Content>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetInner />
    </React.Suspense>
  );
}
