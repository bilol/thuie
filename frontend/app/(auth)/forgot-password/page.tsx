"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { ApiErrorAlert, SuccessAlert } from "@/components/common/alerts";
import { useI18n } from "@/lib/i18n";
import { useForgot } from "@/features/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const forgot = useForgot();
  const { t } = useI18n();
  const [identifier, setIdentifier] = React.useState("");

  return (
    <Card>
      <Card.Content className="gap-4">
        <div>
          <Typography type="h1" weight="bold" className="text-xl">{t.auth.forgot.title}</Typography>
          <p className="text-sm text-muted">
            {t.auth.forgot.subtitle}
          </p>
        </div>

        {forgot.isError && <ApiErrorAlert error={forgot.error} />}
        {forgot.isSuccess && <SuccessAlert title={t.auth.forgot.sent} />}

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            forgot.mutate({ identifier });
          }}
        >
          <TextField name="identifier">
            <Label>{t.auth.handle}</Label>
            <Input
              placeholder={t.auth.handlePlaceholder}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </TextField>
          <PendingButton type="submit" variant="primary" pending={forgot.isPending} className="w-full">
            {t.auth.forgot.sendCode}
          </PendingButton>
        </form>

        {forgot.isSuccess && (
          <Button
            onPress={() => router.push(`/reset-password?identifier=${encodeURIComponent(identifier)}`)}
            variant="secondary"
            fullWidth
          >
            {t.auth.forgot.enterCode}
          </Button>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="text-accent hover:underline">
            {t.auth.backToSignIn}
          </Link>
        </p>
      </Card.Content>
    </Card>
  );
}
