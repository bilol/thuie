"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Avatar, Card, Separator, Typography } from "@heroui/react";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { localizedName } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useFaculty } from "@/features/directory";

const toHttps = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const prettyUrl = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

export default function FacultyDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale, t } = useI18n();
  const { data: member, isLoading, isError, error } = useFaculty(params.id);
  const d = member?.department;
  const dept = d ? localizedName(d, locale) : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <StateBoundary isLoading={isLoading} isError={isError} error={error} isEmpty={!member}>
        {member && (
          <Card>
            <Card.Content className="gap-4">
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  {member.avatar_url && <Avatar.Image src={member.avatar_url} alt={member.name ?? ""} />}
                  <Avatar.Fallback>{member.name?.[0] ?? "?"}</Avatar.Fallback>
                </Avatar>
                <div>
                  <Typography type="h1" weight="bold" className="text-xl">{member.name}</Typography>
                  <p className="text-sm text-muted">{member.title}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                {dept && <p className="text-muted">{t.facultyDetail.department}: {dept}</p>}
                <p className="text-muted">{t.facultyDetail.researchArea}: {member.research_area}</p>
                {member.email && (
                  <p className="flex items-center gap-2 text-muted">
                    <Mail size={16} /> <a href={`mailto:${member.email}`} className="text-accent hover:underline">{member.email}</a>
                  </p>
                )}
                {member.phone && (
                  <p className="flex items-center gap-2 text-muted">
                    <Phone size={16} /> {member.phone}
                  </p>
                )}
                {member.address && (
                  <p className="flex items-start gap-2 text-muted">
                    <MapPin size={16} className="mt-0.5 shrink-0" /> <span className="min-w-0">{member.address}</span>
                  </p>
                )}
                {member.homepage && (
                  <p className="flex items-center gap-2 text-muted">
                    <Globe size={16} className="shrink-0" />
                    <a
                      href={toHttps(member.homepage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate text-accent hover:underline"
                    >
                      {prettyUrl(member.homepage)}
                    </a>
                  </p>
                )}
              </div>
              {member.bio && <p className="whitespace-pre-wrap text-sm text-muted">{member.bio}</p>}
            </Card.Content>
          </Card>
        )}
      </StateBoundary>
    </div>
  );
}
