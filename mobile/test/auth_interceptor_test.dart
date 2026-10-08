import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thuie/data/remote/api_client.dart';

/// A fake transport that 401s any request still carrying the stale bearer and
/// 200s the replay once the token has rotated — no sockets involved.
class _FakeAdapter implements HttpClientAdapter {
  int requests = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests++;
    final auth = options.headers['Authorization']?.toString() ?? '';
    if (auth == 'Bearer stale') {
      return ResponseBody.fromString(
        '{"code":"token_expired","message":"expired"}',
        401,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    }
    return ResponseBody.fromString(
      '{"ok":true}',
      200,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }

  @override
  void close({bool force = false}) {}
}

ApiClient _clientWith(_FakeAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'))
    ..httpClientAdapter = adapter;
  return ApiClient(dio: dio);
}

void main() {
  test('replays the original request once after a single token rotation',
      () async {
    final adapter = _FakeAdapter();
    final client = _clientWith(adapter);
    client.accessToken = 'stale';

    var rotations = 0;
    client.refresh = () async {
      rotations++;
      return 'fresh';
    };

    final resp = await client.get('/infos');

    expect(resp['ok'], true);
    expect(rotations, 1);
    // initial 401 + the replayed request
    expect(adapter.requests, 2);
  });

  test('concurrent 401s share one in-flight rotation (single-flight)',
      () async {
    final adapter = _FakeAdapter();
    final client = _clientWith(adapter);
    client.accessToken = 'stale';

    final completer = Completer<String?>();
    var rotations = 0;
    client.refresh = () {
      rotations++;
      return completer.future;
    };

    // Fire three requests without awaiting: each gets a 401 and piles onto the
    // single shared rotation future.
    final futures = [
      client.get('/infos'),
      client.get('/posts'),
      client.get('/notifications'),
    ];

    // Let the interceptor reach the single-flight refresh, then resolve it once.
    await Future<void>.delayed(const Duration(milliseconds: 20));
    if (!completer.isCompleted) completer.complete('fresh');

    final results = await Future.wait(futures);

    expect(rotations, 1);
    expect(results.every((r) => r['ok'] == true), true);
  });

  test('a failed rotation forces logout and surfaces the 401', () async {
    final adapter = _FakeAdapter();
    final client = _clientWith(adapter);
    client.accessToken = 'stale';

    var lost = false;
    client.refresh = () async => null;
    client.onAuthLost = () => lost = true;

    await expectLater(
      client.get('/infos'),
      throwsA(isA<Exception>()),
    );
    expect(lost, true);
  });
}
