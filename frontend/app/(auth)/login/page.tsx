"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { toastError, toastSuccess } from "@/lib/feedback";
import { ApiError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import { useLogin } from "@/features/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const { t } = useI18n();
  const [handle, setHandle] = React.useState("");
  const [password, setPassword] = React.useState("");

  const err = login.error;
  const isApi = err instanceof ApiError;
  const handleErr = isApi ? err.fieldError("handle") : undefined;
  const passwordErr = isApi ? err.fieldError("password") : undefined;

  return (
    <Card>
      <Card.Content className="gap-4">
        <div>
          <Typography type="h1" weight="bold" className="text-xl">{t.auth.login.title}</Typography>
          <p className="text-sm text-muted">
            {t.auth.login.subtitle}
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate(
              { handle, password },
              {
                onSuccess: () => {
                  toastSuccess(t.auth.login.success);
                  router.push("/");
                },
                // useLogin is meta.silentError, so the global MutationCache stays
                // quiet — surface the failure as a toast.
                onError: (err) => toastError(err),
              },
            );
          }}
        >
          <TextField name="handle" isDisabled={login.isPending} isInvalid={!!handleErr}>
            <Label>{t.auth.handle}</Label>
            <Input
              placeholder={t.auth.handlePlaceholder}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoFocus
            />
            <FieldError>{handleErr}</FieldError>
          </TextField>
          <TextField name="password" type="password" isDisabled={login.isPending} isInvalid={!!passwordErr}>
            <Label>{t.auth.password}</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError>{passwordErr}</FieldError>
          </TextField>
          <PendingButton type="submit" variant="primary" pending={login.isPending} className="w-full">
            {t.auth.login.title}
          </PendingButton>
        </form>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-accent hover:underline">
            {t.auth.login.forgot}
          </Link>
          <Link href="/register" className="text-accent hover:underline">
            {t.auth.login.createAccount}
          </Link>
        </div>
      </Card.Content>
    </Card>
  );
}
