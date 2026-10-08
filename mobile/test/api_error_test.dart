import 'package:flutter_test/flutter_test.dart';
import 'package:thuie/data/remote/api_error.dart';

void main() {
  group('ApiError.fromBody', () {
    test('reads stable code + fields from an RFC-7807 body', () {
      final e = ApiError.fromBody({
        'code': 'keyword_blocked',
        'message': 'contains blocked words',
        'requestId': 'req-1',
      }, 422);

      expect(e.code, 'keyword_blocked');
      expect(e.status, 422);
      expect(e.message, 'contains blocked words');
      expect(e.requestId, 'req-1');
      expect(e.isKeywordBlocked, true);
    });

    test('parses field-level errors', () {
      final e = ApiError.fromBody({
        'code': 'validation_failed',
        'message': 'bad input',
        'errors': [
          {'field': 'title', 'message': 'too short'},
          {'field': 'category', 'message': 'required'},
        ],
      }, 422);

      expect(e.isValidation, true);
      expect(e.errors.length, 2);
      expect(e.firstFieldMessage, 'too short');
    });

    test('falls back to a status-derived code when body omits code', () {
      final e = ApiError.fromBody({'message': 'gone'}, 404);
      expect(e.code, 'not_found');
      expect(e.isNotFound, true);
    });

    test('synthesizes from status on a non-JSON body', () {
      final e = ApiError.fromBody('<html>500</html>', 500);
      expect(e.code, 'internal_error');
      expect(e.status, 500);
    });

    test('transport failure (status 0) maps to network_error', () {
      final e = ApiError.fromBody(null, 0);
      expect(e.code, 'network_error');
    });
  });

  group('ApiError.parse', () {
    test('decodes a JSON string body', () {
      final e = ApiError.parse(
        '{"code":"version_conflict","message":"stale"}',
        412,
      );
      expect(e.code, 'version_conflict');
      expect(e.isVersionConflict, true);
    });

    test('keeps raw string when not valid JSON', () {
      final e = ApiError.parse('plain text failure', 400);
      expect(e.code, 'malformed_request');
      expect(e.message, 'plain text failure');
    });
  });

  group('status predicates', () {
    test('401 unauthorized, 403 forbidden, 429 rate limited', () {
      expect(ApiError(code: 'x', status: 401, message: '').isUnauthorized, true);
      expect(ApiError(code: 'x', status: 403, message: '').isForbidden, true);
      expect(ApiError(code: 'x', status: 429, message: '').isRateLimited, true);
    });
  });
}
