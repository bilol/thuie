"use client";

import * as React from "react";
import { Avatar, Dropdown, Modal, Spinner } from "@heroui/react";
import { Camera, Eye, Trash2 } from "lucide-react";
import { uploadFile } from "@/features/media";
import { apiErrorMessage } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";

/**
 * Social-style avatar control: the avatar itself opens a menu (View / Change or
 * Add / Remove) and carries a camera badge to signal it is editable. Uploads reuse
 * the two-step media flow (`uploadFile`), emitting the pending media id upward and
 * signalling an explicit removal of the saved avatar via `onClear`. "View" pops the
 * full-size image in a lightbox modal.
 */
export function AvatarPicker({
  value,
  onChange,
  currentUrl,
  fallback = "?",
  alt = "avatar",
  onClear,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  /** The avatar already saved on the server, shown until a new upload lands. */
  currentUrl?: string | null;
  fallback?: string;
  alt?: string;
  onClear?: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const openPicker = () => inputRef.current?.click();

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t.media.notImage);
      return;
    }
    // Size is enforced by the backend (§8.2): POST /media rejects oversized files
    // and the resulting ApiError surfaces through apiErrorMessage in the catch.
    setBusy(true);
    try {
      const preview = URL.createObjectURL(file);
      const { media_id } = await uploadFile(file, "avatar");
      setLocalPreview(preview);
      onChange([media_id]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = () => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    onChange([]);
    onClear?.();
  };

  const preview = localPreview ?? (value.length ? null : currentUrl ?? null);
  const hasImage = Boolean(preview);

  const onAction = (key: React.Key) => {
    if (key === "view") setViewOpen(true);
    else if (key === "upload") openPicker();
    else if (key === "remove") clear();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <Dropdown>
        <Dropdown.Trigger
          aria-label={t.media.avatarMenu}
          className="group relative rounded-full outline-none"
        >
          <Avatar size="lg" className={busy ? "opacity-60" : undefined}>
            {preview ? <Avatar.Image src={preview} alt={alt} /> : null}
            <Avatar.Fallback>{fallback}</Avatar.Fallback>
          </Avatar>
          <span
            aria-hidden="true"
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-accent text-white shadow-sm transition-transform group-hover:scale-105"
          >
            {busy ? <Spinner size="sm" className="text-white" /> : <Camera size={14} />}
          </span>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu aria-label={t.media.avatarMenu} onAction={onAction}>
            {hasImage && (
              <Dropdown.Item id="view" textValue={t.media.viewPhoto}>
                <Eye size={16} />
                {t.media.viewPhoto}
              </Dropdown.Item>
            )}
            <Dropdown.Item
              id="upload"
              textValue={hasImage ? t.media.changePhoto : t.media.addPhoto}
              isDisabled={busy}
            >
              <Camera size={16} />
              {hasImage ? t.media.changePhoto : t.media.addPhoto}
            </Dropdown.Item>
            {hasImage && (
              <Dropdown.Item id="remove" textValue={t.media.removePhoto} className="text-danger">
                <Trash2 size={16} />
                {t.media.removePhoto}
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {busy && <span className="text-xs text-muted">{t.media.uploading}</span>}
      {error && <p className="text-xs text-danger">{error}</p>}

      {preview && (
        <Modal>
          <Modal.Backdrop isOpen={viewOpen} onOpenChange={setViewOpen} isDismissable>
            <Modal.Container size="lg">
              <Modal.Dialog>
                {() => (
                  <>
                    <Modal.CloseTrigger />
                    <Modal.Body className="flex justify-center p-0">
                      <img
                        src={preview}
                        alt={alt}
                        className="max-h-[70vh] w-auto rounded-xl object-contain"
                      />
                    </Modal.Body>
                  </>
                )}
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </div>
  );
}
