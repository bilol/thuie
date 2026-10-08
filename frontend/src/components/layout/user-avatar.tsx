"use client";

import { Avatar } from "@heroui/react";
import type { UserView } from "@/lib/api/types";

/** The signed-in user's avatar with an initials fallback. Reused by the dropdown
 *  trigger and the account menu's identity row. */
export function UserAvatar({ user }: { user: UserView | null }) {
  return (
    <Avatar size="sm">
      {user?.avatar_url && <Avatar.Image src={user.avatar_url} alt={user.name ?? ""} />}
      <Avatar.Fallback>{user?.name?.[0] ?? "?"}</Avatar.Fallback>
    </Avatar>
  );
}
