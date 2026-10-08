"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** A single nav destination, rendered as a real anchor so prefetch / middle-click work.
 *  Shared by the desktop list and the mobile strip so the two can't drift apart. */
export function NavItem({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition",
        active
          ? "bg-accent/10 font-medium text-accent"
          : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
