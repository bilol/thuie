"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Typography } from "@heroui/react";
import { Bell, ChevronRight, MessageSquareText, MonitorSmartphone, ShieldBan, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

function NavCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <Card>
      <Card.Content className="flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <Typography type="body-sm" weight="semibold">{title}</Typography>
          <Typography type="body-xs" color="muted">{subtitle}</Typography>
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
        <Link href={href} aria-label={title} className="after:absolute after:inset-0" />
      </Card.Content>
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <NavCard href="/me/settings/security" icon={ShieldCheck} title={t.meSettings.security} subtitle={t.meSettings.securitySubtitle} />
      <NavCard href="/me/settings/notifications" icon={Bell} title={t.meSettings.notifications} subtitle={t.meSettings.notifSubtitle} />
      <NavCard href="/me/settings/privacy" icon={ShieldBan} title={t.meSettings.privacy} subtitle={t.meSettings.privacySubtitle} />
      <NavCard href="/me/sessions" icon={MonitorSmartphone} title={t.sessions.title} subtitle={t.sessions.subtitle} />
      <NavCard href="/me/feedback" icon={MessageSquareText} title={t.meFeedback.title} subtitle={t.meFeedback.subtitle} />
    </div>
  );
}
