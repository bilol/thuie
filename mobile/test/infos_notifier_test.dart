import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thuie/data/notifiers/infos_notifier.dart';
import 'package:thuie/data/remote/api_client.dart';
import 'package:thuie/data/remote/async_status.dart';

/// A scriptable transport: answers each request from a caller-supplied handler
/// so a notifier can be driven through success / empty / error / pagination.
class _ScriptAdapter implements HttpClientAdapter {
  _ScriptAdapter(this.onRequest);
  final ResponseBody Function(RequestOptions options) onRequest;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async =>
      Future.value(onRequest(options));

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Object body, [int status = 200]) => ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );

InfosNotifier _notifier(ResponseBody Function(RequestOptions) handler) {
  final dio = Dio(BaseOptions(baseUrl: 'http://test/api/v1'))
    ..httpClientAdapter = _ScriptAdapter(handler);
  return InfosNotifier(api: ApiClient(dio: dio));
}

void main() {
  test('load() decodes the first cursor page and becomes ready', () async {
    final notifier = _notifier((_) => _json({
          'data': [
            {'id': '1', 'title': 'A', 'category': 'open'},
            {'id': '2', 'title': 'B', 'category': 'recruitment'},
          ],
          'meta': {'nextCursor': 'c2', 'limit': 20},
        }));

    await notifier.load();

    expect(notifier.status, AsyncStatus.ready);
    expect(notifier.items.length, 2);
    expect(notifier.items.first.title, 'A');
    expect(notifier.hasMore, true);
  });

  test('load() surfaces an ApiError and moves to error status', () async {
    final notifier = _notifier((_) =>
        _json({'code': 'permission_denied', 'message': 'nope'}, 403));

    await notifier.load();

    expect(notifier.status, AsyncStatus.error);
    expect(notifier.error?.code, 'permission_denied');
    expect(notifier.isError, true);
  });

  test('an empty collection resolves to ready with no items', () async {
    final notifier = _notifier(
        (_) => _json({'data': <Map<String, dynamic>>[], 'meta': {}}));

    await notifier.load();

    expect(notifier.status, AsyncStatus.ready);
    expect(notifier.items, isEmpty);
    expect(notifier.hasMore, false);
  });

  test('loadMore() appends the next page and clears the cursor at the end',
      () async {
    final notifier = _notifier((options) {
      final cursor = options.queryParameters['cursor'];
      if (cursor == null) {
        return _json({
          'data': [
            {'id': '1', 'title': 'A'}
          ],
          'meta': {'nextCursor': 'c2'},
        });
      }
      return _json({
        'data': [
          {'id': '2', 'title': 'B'}
        ],
        'meta': {},
      });
    });

    await notifier.load();
    expect(notifier.items.length, 1);
    expect(notifier.hasMore, true);

    await notifier.loadMore();
    expect(notifier.items.map((i) => i.id).toList(), ['1', '2']);
    expect(notifier.hasMore, false);
  });
}
