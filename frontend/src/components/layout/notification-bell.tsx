"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@heroui/react";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { connectSocket } from "@/lib/realtime/socket";
import { useNotificationsRealtime, useNotificationsFeed } from "@/features/notifications";

export function NotificationBell() {
  const router = useRouter();
  const { t } = useI18n();

  useNotificationsRealtime();
  React.useEffect(() => {
    connectSocket();
  }, []);

  const feed = useNotificationsFeed({ limit: 20 });
  const unread = React.useMemo(
    () =>
      (feed.data?.pages ?? []).reduce(
        (n, page) => n + page.data.filter((i) => !i.read_at).length,
        0,
      ),
    [feed.data],
  );

  return (
    <Badge.Anchor>
      <Button
        isIconOnly
        variant="ghost"
        aria-label={t.shell.notifications}
        onPress={() => router.push("/notifications")}
      >
        <Bell size={20} />
      </Button>
      {!!unread && <Badge size="sm" color="danger">{unread}</Badge>}
    </Badge.Anchor>
  );
}
