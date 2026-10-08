/**
 * Client-side error model. BACKEND.md §5: the stable machine `code` is the
 * contract; `message` is developer-facing English and NOT localized — so we
 * render user-facing text from `code` via the i18n dictionaries (en/zh).
 */
import { getDict } from "@/lib/i18n/store";

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  errors?: ApiFieldError[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
  readonly fieldErrors: ApiFieldError[];
  retryAfterSec?: number;

  constructor(status: number, body: Partial<ApiErrorBody> = {}, rawMessage?: string) {
    const code = body.code ?? "internal_error";
    super(rawMessage ?? body.message ?? code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = body.details;
    this.requestId = body.requestId;
    this.fieldErrors = body.errors ?? [];
  }

  /** Field-specific validation message for inline form errors (§5 `errors[]`). */
  fieldError(field: string): string | undefined {
    return this.fieldErrors.find((e) => e.field === field)?.message;
  }
}

/** User-facing copy for an ApiError, keyed off the stable `code` (§5 table in i18n). */
export function apiErrorMessage(err: unknown): string {
  const errors = getDict().errors;
  if (err instanceof ApiError) {
    if (err.code === "validation_failed" && err.fieldErrors.length) {
      return err.fieldErrors[0].message;
    }
    return errors.codes[err.code] ?? err.message;
  }
  if (err instanceof TypeError) {
    // fetch/axios network failure — the API is unreachable.
    return errors.network;
  }
  return errors.generic;
}
