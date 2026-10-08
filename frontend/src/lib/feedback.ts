/**
 * App-wide toast feedback (HeroUI v3 Toast). Errors used to be surfaced only by
 * inline `ApiErrorAlert`s on the big forms, leaving every quick action (accept a
 * request, save, RSVP, pin/leave, mark-read…) failing silently. This module is
 * the single channel the global MutationCache and per-call success handlers use,
 * so feedback is consistent and localizable without each call site importing the
 * toast queue.
 */
import { toast } from "@heroui/react";
import { ApiError, apiErrorMessage } from "@/lib/api/errors";

/**
 * Conflicts that are the *expected* outcome of a repeat tap, not a real failure —
 * pressing "Connect" on someone you already asked or already match with. They are
 * handled as a settled state in the UI, so we must not scream a red toast over them.
 */
const BENIGN_CONFLICT_CODES = new Set<string>(["already_requested", "already_connected"]);

/** Localized danger toast for a mutation/API error. Benign conflicts are skipped. */
export function toastError(err: unknown): void {
  if (err instanceof ApiError && BENIGN_CONFLICT_CODES.has(err.code)) return;
  toast.danger(apiErrorMessage(err));
}

/** Localized success toast. */
export function toastSuccess(message: string): void {
  toast.success(message);
}
