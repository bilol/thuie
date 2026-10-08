import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * BACKEND.md §5 error model — stable machine `code`, developer `message`,
 * optional `details`, and `errors[]` for validation (422 only).
 * The Flutter client maps `code` → its own zh/en tables.
 */
export interface FieldError {
  field: string;
  message: string;
}

export class ApiException extends HttpException {
  constructor(
    status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly fieldErrors?: FieldError[],
  ) {
    super({ code, message, details, errors: fieldErrors }, status as HttpStatus);
  }

  // 4xx factories mirroring the §5 status-code map
  static malformedRequest(msg = 'Malformed request')          { return new ApiException(400, 'malformed_request', msg); }
  static invalidCursor(msg = 'Invalid or stale cursor — restart from the first page') { return new ApiException(400, 'invalid_cursor', msg); }
  static invalidCredentials(msg = 'Wrong handle or password') { return new ApiException(401, 'invalid_credentials', msg); }
  static tokenExpired(msg = 'Token expired')                  { return new ApiException(401, 'token_expired', msg); }
  static tokenReused(msg = 'Refresh token reuse detected')    { return new ApiException(401, 'token_reused', msg); }
  static tokenRevoked(msg = 'Token revoked — sign in again')   { return new ApiException(401, 'token_revoked', msg); }
  static permissionDenied(msg = 'Operation not allowed for your role', details?: Record<string, unknown>) { return new ApiException(403, 'permission_denied', msg, details); }
  static insufficientRole(msg = 'Operation not allowed for your role') { return new ApiException(403, 'insufficient_role', msg); }
  static featureDisabled(feature: string, msg?: string) { return new ApiException(403, 'feature_disabled', msg ?? `Section is disabled for your role`, { feature }); }
  static visibilityDenied(msg = 'This content is restricted') { return new ApiException(403, 'visibility_denied', msg); }
  static accountRestricted(msg = 'Account is posting-restricted') { return new ApiException(403, 'account_restricted', msg); }
  static accountBanned(msg = 'Account is banned')             { return new ApiException(403, 'account_banned', msg); }
  static accountDeleted(msg = 'Account was deleted')          { return new ApiException(403, 'account_deleted', msg); }
  static accountUnverified(msg = 'Verify your account first')  { return new ApiException(403, 'account_unverified', msg); }
  static notFound(msg = 'Not found')                          { return new ApiException(404, 'not_found', msg); }
  static conflict(msg: string, code = 'conflict', details?: Record<string, unknown>) { return new ApiException(409, code, msg, details); }
  static invalidOtp(msg = 'Wrong or expired code')            { return new ApiException(400, 'invalid_code', msg); }
  static lockedOut(retryAfterSec: number, msg = 'Too many failed attempts — try later') { return new ApiException(423, 'locked_out', msg, { retryAfter: retryAfterSec }); }
  static versionConflict(msg = 'Resource changed — refetch and retry') { return new ApiException(412, 'version_conflict', msg); }
  static keywordBlocked(word: string)                         { return new ApiException(422, 'keyword_blocked', `Blocked by moderation rule`, { word }); }
  static validationFailed(errors: FieldError[])               { return new ApiException(422, 'validation_failed', 'Validation failed', undefined, errors); }
  static pendingReview(msg = 'Content is locked while pending review') { return new ApiException(422, 'pending_review', msg); }
  static locked(msg = 'Resource under moderation lock', code = 'locked') { return new ApiException(423, code, msg); }
  static rateLimited(retryAfterSec: number, msg = 'Too many requests') { return new ApiException(429, 'rate_limited', msg, { retryAfter: retryAfterSec }); }
  static internal(msg = 'Unexpected server error')            { return new ApiException(500, 'internal_error', msg); }
}
