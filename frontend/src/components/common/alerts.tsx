"use client";

import * as React from "react";
import { Alert } from "@heroui/react";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * Shared inline feedback alerts (PROJECT.md §5.2). The `{status}` + Indicator +
 * Content + Title scaffold was repeated ~34× across pages; centralising it keeps
 * every mutation's error/success notice visually identical and drops the noise.
 */

/** Inline API/mutation error alert. Defaults to the code-derived message. */
export function ApiErrorAlert({
  error,
  title,
  description,
  className,
}: {
  error?: unknown;
  /** Overrides `apiErrorMessage(error)` (e.g. a localized fallback or field message). */
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <Alert status="danger" className={className}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title ?? apiErrorMessage(error)}</Alert.Title>
        {description && <Alert.Description>{description}</Alert.Description>}
      </Alert.Content>
    </Alert>
  );
}

/** Inline success confirmation alert. */
export function SuccessAlert({
  title,
  description,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <Alert status="success" className={className}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        {description && <Alert.Description>{description}</Alert.Description>}
      </Alert.Content>
    </Alert>
  );
}
