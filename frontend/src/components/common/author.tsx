"use client";

import { Avatar } from "@heroui/react";
import { BadgeCheck } from "lucide-react";
import type { UserBrief } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";

/** Small inline "official / verified" badge shown after an author's name. */
export function VerifiedBadge({ label }: { label?: string }) {
  const { t } = useI18n();
  const text = label ?? t.statuses.official;
  return (
    <span title={text} className="inline-flex shrink-0">
      <BadgeCheck size={15} role="img" aria-label={text} className="text-accent" />
    </span>
  );
}

/** Small author byline (avatar + name [+ optional verified badge]) shared across content cards. */
export function Author({ user, verified }: { user: UserBrief | null; verified?: boolean }) {
  if (!user) return null;
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        {user.avatar_url && <Avatar.Image src={user.avatar_url} alt={user.name ?? ""} />}
        <Avatar.Fallback>{user.name?.[0] ?? "?"}</Avatar.Fallback>
      </Avatar>
      <span className="flex items-center gap-1 text-sm text-muted">
        {user.name}
        {verified && <VerifiedBadge />}
      </span>
    </div>
  );
}
