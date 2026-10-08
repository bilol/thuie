"use client";

import * as React from "react";
import { Button } from "@heroui/react";
import { ConfirmDialog, type ConfirmTone } from "./confirm-dialog";

/**
 * A single action button that asks for confirmation before firing (PROJECT.md
 * §5.1 — "danger operations always confirm first"). Thin wrapper over a v3
 * Button + the shared <ConfirmDialog>; pages just pass copy + the handler.
 *
 * The trigger's emphasis is derived from intent (`color`), never from an
 * appearance name: a destructive action reads as the quiet danger variant,
 * anything else as a secondary. Call sites have no `variant` to mis-spell.
 */
export function ConfirmButton({
  title,
  body,
  confirmLabel,
  cancelLabel,
  color = "danger",
  size = "sm",
  isDisabled,
  isLoading,
  onConfirm,
  children,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: ConfirmTone;
  size?: "sm" | "md";
  isDisabled?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        size={size}
        variant={color === "danger" ? "danger-soft" : "secondary"}
        isDisabled={isDisabled}
        onPress={() => setOpen(true)}
      >
        {children}
      </Button>
      <ConfirmDialog
        isOpen={open}
        onOpenChange={setOpen}
        title={title}
        body={body}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        tone={color}
        isLoading={isLoading}
        onConfirm={onConfirm}
      />
    </>
  );
}
