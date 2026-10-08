"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Chip, Typography } from "@heroui/react";
import {
  ArrowUpRight,
  ClipboardList,
  FileText,
  Flag,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users as UsersIcon,
} from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { compactCount } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useAdminStats } from "@/features/admin";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  href?: string;
  hint?: string;
  /** Colours the big value + shows a count bubble on the icon when > 0. */
  tone?: "default" | "warning" | "danger";
  count?: number;
};

function StatCard({ label, value, icon, href, hint, tone = "default", count }: StatCardProps) {
  const { t } = useI18n();
  const valueClass = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "";
  const bubbleColor = tone === "danger" ? "danger" : "warning";
  const iconNode =
    count && count > 0 ? (
      <Badge.Anchor>
        {icon}
        <Badge color={bubbleColor} size="sm">
          {count}
        </Badge>
      </Badge.Anchor>
    ) : (
      icon
    );

  const card = (
    <Card className="h-full">
      <Card.Content className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-2 text-muted">
            {iconNode}
            <Typography type="body-sm" color="muted">{label}</Typography>
          </span>
          {href && <ArrowUpRight size={16} className="text-muted" aria-hidden />}
        </div>
        <Typography type="h3" weight="bold" className={valueClass}>{value}</Typography>
        {hint && <Typography type="body-xs" color="muted">{hint}</Typography>}
      </Card.Content>
    </Card>
  );

  return href ? (
    <Link href={href} className="block h-full" aria-label={t.admin.dashboard.openAria(label)}>
      {card}
    </Link>
  ) : (
    card
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useAdminStats();

  return (
    <div className="space-y-4">
      {data && (data.pending_review > 0 || data.open_reports > 0) && (
        <div className="flex items-center justify-end gap-2">
          {data.pending_review > 0 && (
            <Chip size="sm" variant="tertiary" color="warning">
              {t.admin.dashboard.pendingChip(data.pending_review)}
            </Chip>
          )}
          {data.open_reports > 0 && (
            <Chip size="sm" variant="tertiary" color="danger">
              {t.admin.dashboard.openChip(data.open_reports)}
            </Chip>
          )}
        </div>
      )}

      <StateBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        skeletonRows={4}
      >
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t.admin.dashboard.totalUsers}
                value={compactCount(data.total_users)}
                icon={<UsersIcon size={16} />}
                href="/admin/users"
              />
              <StatCard
                label={t.admin.dashboard.infos}
                value={compactCount(data.total_infos)}
                icon={<FileText size={16} />}
                href="/admin/review?type=info_post"
              />
              <StatCard
                label={t.admin.dashboard.forumPosts}
                value={compactCount(data.total_posts)}
                icon={<MessageSquare size={16} />}
                href="/admin/review?type=forum_post"
              />
              <StatCard
                label={t.admin.dashboard.profiles}
                value={compactCount(data.total_profiles)}
                icon={<UserCheck size={16} />}
                href="/admin/review?type=alumni_profile"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label={t.admin.dashboard.pendingReview}
                value={compactCount(data.pending_review)}
                icon={<ClipboardList size={16} />}
                href="/admin/review"
                hint={t.admin.dashboard.itemsAwaiting}
                tone={data.pending_review > 0 ? "warning" : "default"}
                count={data.pending_review}
              />
              <StatCard
                label={t.admin.dashboard.openReports}
                value={compactCount(data.open_reports)}
                icon={<Flag size={16} />}
                href="/admin/reports"
                hint={t.admin.dashboard.oldestOpen(data.oldest_open_report_hours)}
                tone={data.open_reports > 0 ? "danger" : "default"}
                count={data.open_reports}
              />
              <StatCard
                label={t.admin.dashboard.newSignups}
                value={compactCount(data.signups_7d)}
                icon={<TrendingUp size={16} />}
                href="/admin/users"
              />
            </div>

            <Card>
              <Card.Content className="gap-3">
                <Typography type="h5" weight="semibold">{t.admin.dashboard.quickActions}</Typography>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onPress={() => router.push("/admin/review")}>
                    <ClipboardList size={16} /> {t.admin.dashboard.reviewQueue}
                  </Button>
                  <Button variant="secondary" size="sm" onPress={() => router.push("/admin/reports")}>
                    <Flag size={16} /> {t.admin.dashboard.handleReports}
                  </Button>
                  <Button variant="secondary" size="sm" onPress={() => router.push("/admin/users")}>
                    <UsersIcon size={16} /> {t.admin.dashboard.manageUsers}
                  </Button>
                  <Button variant="tertiary" size="sm" onPress={() => router.push("/admin/keywords")}>
                    {t.admin.dashboard.moderationKeywords}
                  </Button>
                  <Button variant="tertiary" size="sm" onPress={() => router.push("/admin/logs")}>
                    {t.admin.dashboard.auditLogs}
                  </Button>
                </div>
              </Card.Content>
            </Card>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
