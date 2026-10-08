"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Dropdown, Separator } from "@heroui/react";
import {
  ChevronDown,
  LogOut,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import { useSession, isAdmin } from "@/lib/auth/store";
import { useLogout } from "@/features/auth";
import { useI18n } from "@/lib/i18n";
import { UserAvatar } from "@/components/layout/user-avatar";
import { RoleChip } from "@/components/common/status-chip";

export function AccountDropdown({
  placement = "bottom end",
  context = "app",
  showName = false,
}: {
  /** Popover placement — `"top end"` when the trigger sits at a sidebar bottom. */
  placement?: "bottom end" | "top end";
  /** `app` shows the admin "Dashboard" entry (admins only); `admin` hides it. */
  context?: "app" | "admin";
  /** Render a full-width avatar + name + chevron trigger (sidebar footer). */
  showName?: boolean;
} = {}) {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const logout = useLogout();
  const { t } = useI18n();

  const onMenuAction = (key: React.Key) => {
    switch (String(key)) {
      case "me":
        router.push("/me");
        break;
      case "messages":
        router.push("/messages");
        break;
      case "settings":
        router.push("/me/settings");
        break;
      case "admin":
        router.push("/admin");
        break;
      case "logout":
        logout.mutate(undefined, { onSuccess: () => router.push("/login") });
        break;
    }
  };

  const triggerName = user?.name ?? t.shell.profile;

  return (
    <Dropdown>
      {showName ? (
        <Dropdown.Trigger
          aria-label={t.shell.account}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent-soft"
        >
          <UserAvatar user={user} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <span className="w-full truncate text-left text-sm font-medium">{triggerName}</span>
            {user?.role && <RoleChip role={user.role} />}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </Dropdown.Trigger>
      ) : (
        <Dropdown.Trigger aria-label={t.shell.account}>
          <UserAvatar user={user} />
        </Dropdown.Trigger>
      )}
      <Dropdown.Popover placement={placement}>
        <Dropdown.Menu aria-label={t.shell.account} onAction={onMenuAction}>
          {showName ? (
            <Dropdown.Item id="me" textValue={triggerName}>
              <Avatar size="md">
                {user?.avatar_url ? (
                  <Avatar.Image src={user.avatar_url} alt={triggerName} />
                ) : null}
                <Avatar.Fallback>{user?.name?.[0] ?? "?"}</Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-col items-start">
                <span className="truncate font-medium">{triggerName}</span>
                {user?.email && (
                  <span className="truncate text-xs text-muted">{user.email}</span>
                )}
              </div>
            </Dropdown.Item>
          ) : (
            <Dropdown.Item id="me" textValue={triggerName}>
              <UserAvatar user={user} />
              <span className="truncate">{triggerName}</span>
            </Dropdown.Item>
          )}
          <Dropdown.Item id="messages" textValue={t.shell.messages}>
            <MessageSquare size={16} />
            {t.shell.messages}
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue={t.shell.settings}>
            <SettingsIcon size={16} />
            {t.shell.settings}
          </Dropdown.Item>
          {context === "app" &&
            isAdmin() && (
              <Dropdown.Item id="admin" textValue={t.adminTabs.dashboard}>
                {t.adminTabs.dashboard}
              </Dropdown.Item>
            )}
          <Separator />
          <Dropdown.Item id="logout" textValue={t.shell.signOut} className="text-danger">
            <LogOut size={16} />
            {t.shell.signOut}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
