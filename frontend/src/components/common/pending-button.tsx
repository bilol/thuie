"use client";

import * as React from "react";
import { Button, Spinner } from "@heroui/react";

/**
 * HeroUI `Button` with the app-wide pending treatment: an inline spinner rendered
 * before the label while `pending` is true. Encapsulates the
 * `{({ isPending }) => (<>{isPending && <Spinner … />}{label}</>)}` render-prop
 * duplicated across the submit/action buttons, while still forwarding every
 * native Button prop (variant, size, type, onPress, isDisabled, fullWidth, …).
 *
 * Buttons whose pending state swaps an icon (rather than prefixing a label) are
 * intentionally left as plain `<Button>` render-props — that behaviour differs.
 */
type ButtonProps = Omit<React.ComponentProps<typeof Button>, "children" | "isPending">;

export function PendingButton({
  pending,
  children,
  ...props
}: ButtonProps & {
  pending?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Button {...props} isPending={pending}>
      {({ isPending: busy }) => (
        <>
          {busy && <Spinner color="current" size="sm" />}
          {children}
        </>
      )}
    </Button>
  );
}
