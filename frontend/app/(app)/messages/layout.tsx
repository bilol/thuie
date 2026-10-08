"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConversationList } from "@/features/messaging";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const conversationOpen = /^\/messages\/[^/]+/.test(pathname);

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-lg border border-separator bg-surface">
      <aside
        className={cn(
          "min-h-0 w-full flex-col border-r border-separator md:flex md:w-80 md:shrink-0 lg:w-96",
          conversationOpen ? "hidden" : "flex",
        )}
      >
        <ConversationList />
      </aside>

      <section className={cn("min-h-0 flex-1 flex-col", conversationOpen ? "flex" : "hidden md:flex")}>
        {children}
      </section>
    </div>
  );
}
