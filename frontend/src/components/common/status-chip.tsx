"use client";

import { Chip } from "@heroui/react";
import { useI18n } from "@/lib/i18n";

type Color = "default" | "accent" | "success" | "warning" | "danger";

const COLOR_BY_STATUS: Record<string, Color> = {
  draft: "default",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  taken_down: "danger",
  removed: "danger",
  resubmitted: "warning",
  submitted: "default",
  unverified: "warning",
  active: "success",
  posting_restricted: "warning",
  banned: "danger",
  deleted: "default",
  accepted: "success",
  declined: "default",
  revoked: "default",
  withdrawn: "default",
  ended: "default",
  open: "warning",
  resolved_ignored: "default",
  resolved_deleted: "danger",
  resolved_restricted: "warning",
  answered: "success",
  closed: "default",
  published: "success",
  cancelled: "danger",
  archived: "default",
  registered: "accent",
  attended: "success",
  official: "accent",
  user: "default",
  school: "accent",
};

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusChip({
  status,
  label,
  size = "sm",
}: {
  status?: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const text = label ?? (status ? t.statuses[status] ?? humanize(status) : undefined);
  if (!text) return null;
  return (
    <Chip size={size} variant="soft" color={(status ? COLOR_BY_STATUS[status] : undefined) ?? "default"}>
      {text}
    </Chip>
  );
}

const PUBLICLY_VISIBLE = new Set(["approved", "published"]);

export function ContentStatusChip({
  status,
  size = "sm",
}: {
  status?: string;
  size?: "sm" | "md";
}) {
  if (!status || PUBLICLY_VISIBLE.has(status)) return null;
  return <StatusChip status={status} size={size} />;
}

export function MetaChip({
  children,
  color = "default",
}: {
  children: React.ReactNode;
  color?: Color;
}) {
  return (
    <Chip size="sm" variant="soft" color={color}>
      {children}
    </Chip>
  );
}

const COLOR_BY_ROLE: Record<string, Color> = {
  student: "default",
  graduate: "success",
  admin: "accent",
  admin_super: "accent",
};

export function RoleChip({ role, size = "sm" }: { role?: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  if (!role) return null;
  return (
    <Chip
      size={size}
      variant={role === "admin_super" ? "primary" : "soft"}
      color={COLOR_BY_ROLE[role] ?? "default"}
    >
      {t.roles[role] ?? humanize(role)}
    </Chip>
  );
}
