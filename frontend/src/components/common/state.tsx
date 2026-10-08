"use client";

import * as React from "react";
import { Alert, Button, Skeleton, Spinner } from "@heroui/react";
import { apiErrorMessage } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";

/**
 * Consistent loading / error / empty boundaries (PROJECT.md §5.2). Every page
 * wraps its data region so the three states look identical across the app.
 */

export function StateBoundary({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  skeletonRows = 4,
  skeleton,
  emptyTitle,
  emptyBody,
  emptyIcon,
  emptyAction,
  children,
}: {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  skeletonRows?: number;
  /** Custom loading placeholder (e.g. a card grid); overrides `skeletonRows`. */
  skeleton?: React.ReactNode;
  emptyTitle?: string;
  emptyBody?: React.ReactNode;
  /** Soft accent tile above the title — gives the empty state an identity. */
  emptyIcon?: React.ReactNode;
  /** Primary affordance (e.g. a CTA button) so an empty screen is a detour, not a dead end. */
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  if (isLoading) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <div className="skeleton--shimmer relative space-y-3 overflow-hidden">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} animationType="none" className={i === skeletonRows - 1 ? "h-16 w-4/5 rounded-lg" : "h-16 w-full rounded-lg"} />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t.common.somethingWrong}</Alert.Title>
          <Alert.Description>
            <div className="flex flex-col gap-3">
              <span>{apiErrorMessage(error)}</span>
              {onRetry && (
                <Button size="sm" variant="secondary" onPress={onRetry}>
                  {t.common.retry}
                </Button>
              )}
            </div>
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-separator py-16 text-center">
        {emptyIcon && (
          <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">{emptyIcon}</span>
        )}
        <p className="text-sm font-medium text-foreground">{emptyTitle ?? t.common.nothingHere}</p>
        {emptyBody && <p className="max-w-sm text-sm text-muted">{emptyBody}</p>}
        {emptyAction && <div className="mt-2 flex items-center gap-2">{emptyAction}</div>}
      </div>
    );
  }
  return <>{children}</>;
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-muted">
      <Spinner size="sm" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
