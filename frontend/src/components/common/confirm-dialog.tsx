"use client";

import * as React from "react";
import { AlertDialog, Button } from "@heroui/react";
import { useI18n } from "@/lib/i18n";

export type ConfirmTone = "danger" | "primary" | "warning";

/**
 * Single source of truth for confirmation dialogs, built on HeroUI v3's
 * `AlertDialog`. Both standalone buttons (`ConfirmButton`) and the
 * "more actions" menu (`ItemActionsMenu`) route destructive/secondary
 * actions here, so there is only one confirm UI (PROJECT.md §5.1).
 */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  isLoading,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  isLoading?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading className="text-base font-semibold">{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            {body && <AlertDialog.Body className="text-sm text-muted">{body}</AlertDialog.Body>}
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => onOpenChange(false)}>
                {cancelLabel ?? t.common.cancel}
              </Button>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                isPending={isLoading}
                onPress={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
              >
                {confirmLabel ?? t.common.confirm}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
