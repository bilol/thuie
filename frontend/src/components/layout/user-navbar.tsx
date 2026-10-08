"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Search as SearchIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NAV } from "@/components/layout/nav-config";
import { NavItem } from "@/components/layout/nav-item";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AccountDropdown } from "@/components/layout/account-dropdown";

export function UserNavbar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-separator bg-background/70 backdrop-blur-lg">
        <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="THUIE home" className="inline-flex items-center rounded-lg bg-brand px-3 py-1.5">
              <Image src="/logo.png" alt="清华大学 工业工程系 · Department of Industrial Engineering, Tsinghua University" width={446} height={66} className="h-8 w-auto" priority />
            </Link>
            <ul className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <li key={item.href}>
                  <NavItem href={item.href} active={isActive(item.href)} label={t.nav[item.labelKey]} />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <Button
              isIconOnly
              variant="ghost"
              aria-label={t.common.search}
              onPress={() => router.push("/search")}
            >
              <SearchIcon size={20} />
            </Button>
            <NotificationBell />
            <AccountDropdown />
          </div>
        </header>
      </nav>

      <div className="flex gap-1 overflow-x-auto border-b border-separator px-4 py-2 md:hidden">
        {NAV.map((item) => (
          <NavItem key={item.href} href={item.href} active={isActive(item.href)} label={t.nav[item.labelKey]} />
        ))}
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
