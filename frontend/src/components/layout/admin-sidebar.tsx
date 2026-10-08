"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAdminSuper } from "@/lib/auth/store";
import { useI18n } from "@/lib/i18n";
import { Separator } from "@heroui/react";
import { ADMIN_NAV } from "@/components/layout/admin-nav-config";
import { AccountDropdown } from "@/components/layout/account-dropdown";

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isSuper = isAdminSuper();

  const links = ADMIN_NAV.filter((l) => !l.superOnly || isSuper);

  // Plain render helper (not a component) so the nav never remounts on parent
  // re-renders — that would drop the mobile strip's scroll position.
  const navList = (orientation: "rail" | "strip") => (
    <nav
      aria-label={t.adminTabs.console}
      className={orientation === "rail" ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto"}
    >
      {links.map((l) => {
        const active = pathname === l.href;
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              active ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface"
            }`}
          >
            <Icon size={16} />
            {t.adminTabs[l.labelKey]}
          </Link>
        );
      })}
    </nav>
  );

  const brand = <p className="font-semibold">{t.adminTabs.dashboard}</p>;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-separator bg-background/70 backdrop-blur-lg md:hidden">
        <header className="flex items-center justify-between gap-2 px-4 py-3">
          {brand}
          <AccountDropdown placement="bottom end" context="admin" />
        </header>
        <div className="px-4 pb-2">{navList("strip")}</div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-4 py-6">
        <aside className="relative sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col gap-3 pr-3 md:flex">
          {brand}

          <div className="min-h-0 flex-1 overflow-y-auto">{navList("rail")}</div>

          <div className="shrink-0 border-t border-separator pt-3">
            <AccountDropdown placement="top end" context="admin" showName />
          </div>

          <Separator orientation="vertical" className="absolute inset-y-0 right-0" />
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
