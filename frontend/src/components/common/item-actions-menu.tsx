"use client";

import * as React from "react";
import { Dropdown } from "@heroui/react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";

export type ItemAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Visual tone only; does not change behavior. */
  tone?: "default" | "danger";
  isDisabled?: boolean;
  /** Fired immediately on select. Ignored when `confirm` is set. */
  onPress?: () => void;
  /** When present, selecting the item opens a confirmation modal first. */
  confirm?: {
    title: React.ReactNode;
    body?: React.ReactNode;
    confirmLabel?: string;
    isLoading?: boolean;
    onConfirm: () => void;
  };
};

/**
 * Groups secondary / owner / destructive actions for a list row or detail item
 * behind a single "more actions" ellipsis, so surfaces expose exactly one
 * primary inline action and park the rest here. Destructive actions declare a
 * `confirm` and are always routed through a confirmation modal.
 */
export function ItemActionsMenu({
  label = "More actions",
  items,
  size = "sm",
  triggerVariant = "tertiary",
}: {
  label?: string;
  items: ItemAction[];
  size?: "sm" | "md";
  triggerVariant?: "tertiary" | "secondary" | "ghost";
}) {
  const [pending, setPending] = React.useState<ItemAction | null>(null);

  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  const onAction = (key: React.Key) => {
    const item = visible.find((i) => i.id === String(key));
    if (!item) return;
    if (item.confirm) {
      setPending(item);
    } else {
      item.onPress?.();
    }
  };

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger
          aria-label={label}
          isDisabled={visible.every((i) => i.isDisabled)}
          className={cn(
            "inline-flex items-center justify-center rounded-lg outline-none transition-colors hover:bg-accent-soft",
            size === "sm" ? "size-8" : "size-9",
            triggerVariant === "ghost" && "text-muted",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <MoreHorizontal size={18} />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu aria-label={label} onAction={onAction}>
            {visible.map((item) => (
              <Dropdown.Item
                key={item.id}
                id={item.id}
                textValue={item.label}
                isDisabled={item.isDisabled}
                className={item.tone === "danger" ? "text-danger" : undefined}
              >
                {item.icon}
                {item.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <ConfirmDialog
        isOpen={!!pending}
        onOpenChange={(o) => {
          if (!o) setPending(null);
        }}
        title={pending?.confirm?.title}
        body={pending?.confirm?.body}
        confirmLabel={pending?.confirm?.confirmLabel}
        tone={pending?.tone === "danger" ? "danger" : "primary"}
        isLoading={pending?.confirm?.isLoading}
        onConfirm={() => pending?.confirm?.onConfirm()}
      />
    </>
  );
}
