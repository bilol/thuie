"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Typography } from "@heroui/react";
import { Bookmark, CalendarClock, UserCog, Users } from "lucide-react";
import { AccountTab } from "@/features/me/components/account-tab";
import { useI18n } from "@/lib/i18n";

type HubLink = { href: string; label: string; icon: React.ElementType };

function HubCard({ link }: { link: HubLink }) {
  const Icon = link.icon;
  return (
    <Card>
      <Card.Content className="flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon size={18} />
        </span>
        <Typography type="body-sm" weight="semibold" className="min-w-0 flex-1 truncate">
          {link.label}
        </Typography>
        <Link href={link.href} aria-label={link.label} className="after:absolute after:inset-0" />
      </Card.Content>
    </Card>
  );
}

export default function MePage() {
  const { t } = useI18n();

  const links: HubLink[] = [
    { href: "/me/alumni", label: t.meTabs.alumniProfile, icon: Users },
    { href: "/me/favorites", label: t.favorites.title, icon: Bookmark },
    { href: "/connections", label: t.connections.title, icon: CalendarClock },
    { href: "/mentorship", label: t.mentorship.title, icon: UserCog },
  ];

  return (
    <div className="space-y-6">
      <AccountTab />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <HubCard key={l.href} link={l} />
        ))}
      </div>
    </div>
  );
}
