"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { ApiErrorAlert } from "@/components/common/alerts";
import { ApiError } from "@/lib/api/errors";
import { OptionSelect } from "@/components/common/option-select";
import { localizedName } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useRegister } from "@/features/auth";
import { useDepartments } from "@/features/directory";
import type { RegisterRequest } from "@/lib/api/types";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const { locale, t } = useI18n();
  const { data: departments } = useDepartments();
  const [form, setForm] = React.useState<RegisterRequest>({
    name: "",
    role: "student",
    password: "",
  });

  const set = <K extends keyof RegisterRequest>(k: K, v: RegisterRequest[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const err = register.error;
  const isApi = err instanceof ApiError;
  const badPassword = form.password.length > 0 && !PASSWORD_RULE.test(form.password);
  const passwordErrMsg = isApi
    ? err.fieldError("password")
    : badPassword
      ? t.auth.passwordRule
      : undefined;

  return (
    <Card>
      <Card.Content className="gap-4">
        <div>
          <Typography type="h1" weight="bold" className="text-xl">{t.auth.register.title}</Typography>
          <p className="text-sm text-muted">
            {t.auth.register.subtitle}
          </p>
        </div>

        {err && (
          <ApiErrorAlert
            title={isApi ? err.fieldError("name") ?? t.auth.register.failed : t.auth.register.failed}
          />
        )}

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const identifier = form.email || form.phone || form.student_id || "";
            register.mutate(form, {
              onSuccess: (res) =>
                router.push(
                  `/verify?identifier=${encodeURIComponent(identifier)}${
                    res.otp_code ? `&code=${res.otp_code}` : ""
                  }`,
                ),
            });
          }}
        >
          <TextField
            name="name"
            isDisabled={register.isPending}
            isInvalid={isApi && !!err.fieldError("name")}
          >
            <Label>{t.auth.register.fullName}</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            <FieldError>{isApi ? err.fieldError("name") : undefined}</FieldError>
          </TextField>

          <OptionSelect
            label={t.auth.register.role}
            value={form.role}
            onChange={(k) => set("role", k as RegisterRequest["role"])}
            isDisabled={register.isPending}
            options={[
              { key: "student", label: t.auth.register.student },
              { key: "graduate", label: t.auth.register.graduate },
            ]}
          />

          {form.role === "student" && (
            <TextField
              name="student_id"
              isDisabled={register.isPending}
              isInvalid={isApi && !!err.fieldError("student_id")}
            >
              <Label>{t.auth.register.studentId}</Label>
              <Input
                value={form.student_id ?? ""}
                onChange={(e) => set("student_id", e.target.value)}
              />
              <FieldError>{isApi ? err.fieldError("student_id") : undefined}</FieldError>
            </TextField>
          )}

          <TextField
            name="email"
            type="email"
            isDisabled={register.isPending}
            isInvalid={isApi && !!err.fieldError("email")}
          >
            <Label>{t.auth.register.email}</Label>
            <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            <FieldError>{isApi ? err.fieldError("email") : undefined}</FieldError>
          </TextField>
          <TextField
            name="phone"
            isDisabled={register.isPending}
            isInvalid={isApi && !!err.fieldError("phone")}
          >
            <Label>{t.auth.register.phone}</Label>
            <Input
              placeholder={t.auth.register.phonePlaceholder}
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
            <FieldError>{isApi ? err.fieldError("phone") : undefined}</FieldError>
          </TextField>

          {departments && (
            <OptionSelect
              label={t.auth.register.department}
              value={form.department ?? null}
              onChange={(k) => set("department", k)}
              placeholder={t.auth.register.departmentPlaceholder}
              isDisabled={register.isPending}
              options={departments.map((d) => ({ key: d.code, label: localizedName(d, locale) }))}
            />
          )}

          {form.role === "student" && (
            <TextField name="grade_year" isDisabled={register.isPending}>
              <Label>{t.auth.register.gradeYear}</Label>
              <Input
                placeholder="2024"
                value={form.grade_year ?? ""}
                onChange={(e) => set("grade_year", e.target.value)}
              />
            </TextField>
          )}

          <TextField
            name="password"
            type="password"
            isDisabled={register.isPending}
            isInvalid={!!passwordErrMsg}
          >
            <Label>{t.auth.password}</Label>
            <Input value={form.password} onChange={(e) => set("password", e.target.value)} />
            <Description>{t.auth.register.passwordHint}</Description>
            <FieldError>{passwordErrMsg}</FieldError>
          </TextField>

          <PendingButton
            type="submit"
            variant="primary"
            pending={register.isPending}
            isDisabled={badPassword}
            className="w-full"
          >
            {t.auth.register.title}
          </PendingButton>
        </form>

        <p className="text-center text-sm">
          {t.auth.register.alreadyHaveAccount}{" "}
          <Link href="/login" className="text-accent hover:underline">
            {t.auth.register.signIn}
          </Link>
        </p>
      </Card.Content>
    </Card>
  );
}
