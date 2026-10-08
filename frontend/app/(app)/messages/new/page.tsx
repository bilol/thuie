"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, Button, Input, TextField, Typography } from "@heroui/react";
import { ArrowLeft, MessageSquareText, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ApiErrorAlert } from "@/components/common/alerts";
import { useCreateConversation } from "@/features/messaging";

function NewConversation() {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const peerId = sp.get("peer");
  const name = sp.get("name") || t.conversation.newTitle;
  const avatar = sp.get("avatar");
  const start = useCreateConversation();
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    if (!peerId) router.replace("/messages");
  }, [peerId, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !peerId) return;
    start.mutate(
      { participant_id: peerId, content },
      { onSuccess: (conv) => router.replace(`/messages/${conv.id}`) },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-separator">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/messages"
            aria-label={t.conversation.back}
            className="-ml-1 inline-flex items-center rounded-lg p-1.5 text-muted transition hover:bg-accent-soft hover:text-foreground md:hidden"
          >
            <ArrowLeft size={18} />
          </Link>
          <Avatar size="sm">
            {avatar && <Avatar.Image src={avatar} alt={name} />}
            <Avatar.Fallback>{name[0] ?? "?"}</Avatar.Fallback>
          </Avatar>
          <Typography type="body-sm" weight="semibold" truncate>{name}</Typography>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted">
        <MessageSquareText size={28} />
        <p className="max-w-xs text-sm">{t.conversation.startHint}</p>
      </div>

      {start.isError && (
        <div className="px-3 pb-2">
          <ApiErrorAlert error={start.error} />
        </div>
      )}

      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-separator p-3">
        <TextField aria-label={t.conversation.inputAria} className="flex-1">
          <Input placeholder={t.conversation.inputPlaceholder} value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} />
        </TextField>
        <Button type="submit" isIconOnly variant="primary" aria-label={t.common.send} isPending={start.isPending} isDisabled={!draft.trim()}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}

export default function NewConversationPage() {
  return (
    <React.Suspense fallback={null}>
      <NewConversation />
    </React.Suspense>
  );
}
