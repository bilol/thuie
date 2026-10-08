import {
  Building2,
  ClipboardList,
  Flag,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";
import type { ElementType } from "react";
import type { Dictionary } from "@/lib/i18n";

/**
 * Sections shown in the admin sidebar. Mirrors `nav-config.ts` for the user
 * navbar, but carries icons + a `superOnly` flag because the admin rail needs
 * both and hides Roles from plain admins.
 */
export const ADMIN_NAV: {
  href: string;
  labelKey: keyof Dictionary["adminTabs"];
  icon: ElementType;
  /** Hidden from plain admins — the endpoint is admin_super-only. */
  superOnly?: boolean;
}[] = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/review", labelKey: "review", icon: ClipboardList },
  { href: "/admin/reports", labelKey: "reports", icon: Flag },
  { href: "/admin/feedback", labelKey: "feedback", icon: Inbox },
  { href: "/admin/keywords", labelKey: "keywords", icon: KeyRound },
  { href: "/admin/users", labelKey: "users", icon: Users },
  { href: "/admin/faculty", labelKey: "faculty", icon: Building2 },
  { href: "/admin/roles", labelKey: "roles", icon: Shield, superOnly: true },
  { href: "/admin/logs", labelKey: "logs", icon: ScrollText },
];
