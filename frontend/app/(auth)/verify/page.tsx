"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { ApiErrorAlert, SuccessAlert } from "@/components/common/alerts";
import { useI18n } from "@/lib/i18n";
import { useVerify, useResend } from "@/features/auth";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const identifier = params.get("identifier") ?? "";
  const verify = useVerify();
  const resend = useResend();
  const { t } = useI18n();
  const [code, setCode] = React.useState(params.get("code") ?? "");

  return (
    <Card>
      <Card.Content className="gap-4">
        <div>
          <Typography type="h1" weight="bold" className="text-xl">{t.auth.verify.title}</Typography>
          <p className="text-sm text-muted">
            {t.auth.verify.sentTo(identifier || t.auth.verify.yourContact)}
          </p>
        </div>

        {verify.isError && <ApiErrorAlert error={verify.error} />}
        {resend.isSuccess && <SuccessAlert title={t.auth.verify.resent} />}

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            resend.reset();
            verify.mutate(
              { identifier, purpose: "register_verify", code },
              { onSuccess: () => router.replace("/") },
            );
          }}
        >
          <TextField name="code">
            <Label>{t.auth.verify.code}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoFocus
            />
          </TextField>
          <PendingButton type="submit" variant="primary" pending={verify.isPending} fullWidth>
            {t.auth.verify.verifyAndContinue}
          </PendingButton>
        </form>

        <div className="flex items-center justify-between text-sm">
          <PendingButton
            variant="tertiary"
            size="sm"
            pending={resend.isPending}
            onPress={() => {
              verify.reset();
              resend.mutate({ identifier, purpose: "register_verify" });
            }}
          >
            {t.auth.verify.resend}
          </PendingButton>
          <Link href="/login" className="text-muted hover:underline">
            {t.auth.backToSignIn}
          </Link>
        </div>
      </Card.Content>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyInner />
    </React.Suspense>
  );
}
