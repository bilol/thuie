"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, Input, Label, TextArea, TextField } from "@heroui/react";
import { PendingButton } from "@/components/common/pending-button";
import { TagInput } from "@/components/common/tag-input";
import { useCan } from "@/lib/auth/guards";
import { useI18n } from "@/lib/i18n";
import { useCreatePost } from "@/features/forum";
import { ApiErrorAlert } from "@/components/common/alerts";
import type { PostCreate } from "@/lib/api/types";

export default function NewPostPage() {
  const router = useRouter();
  const create = useCreatePost();
  const { t } = useI18n();
  const canPost = useCan("can_post_forum");
  const [form, setForm] = React.useState<PostCreate>({ title: "", content: "", tags: [] });

  const set = <K extends keyof PostCreate>(k: K, v: PostCreate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim().length > 0 && form.content.trim().length > 0;

  if (!canPost) {
    return (
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t.newPost.disabledTitle}</Alert.Title>
          <Alert.Description>{t.newPost.disabledBody}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <Card.Content className="gap-4">
          {create.isError && <ApiErrorAlert error={create.error} />}
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form, { onSuccess: (post) => router.push(`/forum/${post.id}`) });
            }}
          >
            <TextField name="title">
              <Label>{t.common.title}</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
            </TextField>
            <TextField name="content">
              <Label>{t.common.content}</Label>
              <TextArea rows={8} value={form.content} onChange={(e) => set("content", e.target.value)} />
            </TextField>
            <TextField name="location">
              <Label>{t.newPost.locationOptional}</Label>
              <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
            </TextField>
            <TagInput label={t.common.tags} value={form.tags ?? []} onChange={(tags) => set("tags", tags)} />
            <PendingButton type="submit" variant="primary" pending={create.isPending} isDisabled={!valid} fullWidth>
              {t.newPost.postThread}
            </PendingButton>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
