"use client";

import { MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function MessagesPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted">
      <MessageSquare size={28} />
      <p className="max-w-xs text-sm">{t.conversation.placeholder}</p>
    </div>
  );
}
