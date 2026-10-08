"use client";

import Link from "next/link";
import { Avatar, Card, Typography } from "@heroui/react";
import { localizedName } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { FacultyMember } from "@/lib/api/types";

export function FacultyCard({ member }: { member: FacultyMember }) {
  const { locale } = useI18n();
  return (
    <Link href={`/faculty/${member.id}`} className="block h-full">
      <Card className="h-full">
        <Card.Content className="h-full items-center justify-center gap-2 text-center">
          <Avatar size="lg" className="size-20 rounded-full">
            {member.avatar_url && <Avatar.Image src={member.avatar_url} alt={member.name ?? ""} />}
            <Avatar.Fallback className="text-2xl">{member.name?.[0] ?? "?"}</Avatar.Fallback>
          </Avatar>
          <div className="w-full min-w-0 text-center">
            <Typography type="h6" truncate className="w-full text-center">{member.name}</Typography>
            <Typography type="body-sm" color="muted" truncate className="w-full text-center">{member.title || "\u2014"}</Typography>
            <Typography type="body-xs" color="muted" truncate className="w-full text-center">
              {localizedName(member.department, locale) || "\u2014"}
            </Typography>
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}
