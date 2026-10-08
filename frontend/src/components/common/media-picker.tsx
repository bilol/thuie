"use client";

import * as React from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { Paperclip, Upload, X } from "lucide-react";
import { uploadFile } from "@/features/media";
import { apiErrorMessage } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MediaRequest } from "@/lib/api/types";

/** Per-kind byte caps, mirroring the backend §8.2 policy, so an oversized file is
 *  rejected in the picker with a friendly message instead of a raw API error. */
const MAX_BYTES: Record<MediaRequest["kind"], number> = {
  image: 10 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
  attachment: 25 * 1024 * 1024,
};

/**
 * Two-step upload control (BACKEND.md §6.9 / `uploadFile`): pick a file → the
 * media API mints a presigned slot → bytes go straight to object storage. Emits
 * the collected `media_id`s upward so the owning form submits them with the post.
 */
export function MediaPicker({
  kind = "image",
  max = 4,
  value,
  onChange,
}: {
  kind?: MediaRequest["kind"];
  max?: number;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [names, setNames] = React.useState<Record<string, string>>({});

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      const room = max - value.length;
      const next = [...value];
      const named = { ...names };
      const cap = MAX_BYTES[kind];
      let oversized = false;
      for (const file of Array.from(files).slice(0, Math.max(0, room))) {
        if (file.size > cap) {
          oversized = true;
          continue;
        }
        const { media_id } = await uploadFile(file, kind);
        next.push(media_id);
        named[media_id] = file.name;
      }
      if (oversized) setError(t.media.tooLarge(Math.round(cap / (1024 * 1024))));
      setNames(named);
      onChange(next);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple={max > 1}
        accept={kind === "image" || kind === "avatar" ? "image/*" : undefined}
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          isPending={busy}
          isDisabled={value.length >= max}
          onPress={() => inputRef.current?.click()}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner size="sm" /> : <Upload size={16} />}
              {kind === "image" || kind === "avatar" ? t.media.addImage : t.media.attachFile}
            </>
          )}
        </Button>
        {busy && <span className="text-xs text-muted">{t.media.uploading}</span>}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <Chip key={id} size="sm" variant="tertiary">
              <Paperclip size={12} />
              {names[id] ?? id}
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t.media.remove}
                onPress={() => remove(id)}
              >
                <X size={12} />
              </Button>
            </Chip>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
