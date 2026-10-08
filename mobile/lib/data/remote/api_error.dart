import 'dart:convert';

/// A typed mirror of the RFC-7807-ish error body (BACKEND.md §5):
/// `{ code, message, details?, requestId, errors? }`.
///
/// `code` is the **stable contract** the client renders user-facing text from
/// (§2: the message is developer-facing English and is never trusted for UI).
/// So screens map `code` → their own zh/en string; [message] is only a fallback
/// for unexpected/developer cases.
class FieldError {
  final String field;
  final String message;
  const FieldError(this.field, this.message);

  factory FieldError.fromJson(Map<String, dynamic> j) => FieldError(
        (j['field'] ?? '').toString(),
        (j['message'] ?? '').toString(),
      );
}

class ApiError implements Exception {
  /// Stable machine code, e.g. `keyword_blocked`, `version_conflict`,
  /// `token_expired`, `validation_failed` (§5 status map).
  final String code;

  /// HTTP status the server responded with (0 when transport failed).
  final int status;

  /// Developer-facing English. Not shown directly to end users.
  final String message;

  /// Field-level failures, present only for `422 validation_failed`.
  final List<FieldError> errors;

  /// Type-specific payload (e.g. `requiredRole`, `retryAfter`).
  final Map<String, dynamic>? details;

  /// `X-Request-Id` for tracing (echoed by §5).
  final String? requestId;

  const ApiError({
    required this.code,
    required this.status,
    required this.message,
    this.errors = const [],
    this.details,
    this.requestId,
  });

  factory ApiError.fromBody(Object? body, int status, {String? requestId}) {
    if (body is Map<String, dynamic>) {
      final errors = (body['errors'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(FieldError.fromJson)
              .toList() ??
          const <FieldError>[];
      return ApiError(
        code: (body['code'] ?? _codeForStatus(status)).toString(),
        status: status,
        message: (body['message'] ?? '').toString(),
        errors: errors,
        details: body['details'] is Map<String, dynamic>
            ? Map<String, dynamic>.from(body['details'] as Map)
            : null,
        requestId: (body['requestId'] ?? requestId)?.toString(),
      );
    }
    // Non-JSON body (HTML error page, empty): synthesize from status.
    return ApiError(
      code: _codeForStatus(status),
      status: status,
      message: body is String ? body : '',
      requestId: requestId,
    );
  }

  /// Best-effort decode of a dio error's `response.data`, which may already be a
  /// decoded map, a raw string, or null (transport failure).
  factory ApiError.parse(Object? data, int status, {String? requestId}) {
    Object? body = data;
    if (body is String && body.isNotEmpty) {
      try {
        body = jsonDecode(body);
      } catch (_) {/* keep as raw string */}
    }
    return ApiError.fromBody(body, status, requestId: requestId);
  }

  // ---- Convenience predicates the UI branches on (§5) ----
  bool get isUnauthorized => status == 401;
  bool get isForbidden => status == 403;
  bool get isNotFound => status == 404;
  bool get isVersionConflict => code == 'version_conflict';
  bool get isKeywordBlocked => code == 'keyword_blocked';
  bool get isValidation => code == 'validation_failed';
  bool get isRateLimited => status == 429;

  /// The first field error's message, when present (inline form validation).
  String? get firstFieldMessage => errors.isNotEmpty ? errors.first.message : null;

  static String _codeForStatus(int status) => switch (status) {
        400 => 'malformed_request',
        401 => 'token_expired',
        403 => 'permission_denied',
        404 => 'not_found',
        409 => 'conflict',
        412 => 'version_conflict',
        422 => 'validation_failed',
        423 => 'locked',
        429 => 'rate_limited',
        0 => 'network_error',
        _ => 'internal_error',
      };

  @override
  String toString() => 'ApiError($code, $status): $message';
}
