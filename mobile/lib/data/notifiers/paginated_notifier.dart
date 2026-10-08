import 'package:flutter/foundation.dart';

import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';

/// Base for the cursor-paginated feeds (§4): infos, posts, notifications,
/// favorites, history, reports. Sub-classes declare their [resourcePath],
/// optional [baseQuery] filters and the row [decode]; this handles the
/// status/`items`/`nextCursor`/`loadMore()` lifecycle once.
abstract class PaginatedNotifier<T> extends ChangeNotifier {
  PaginatedNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;

  /// Shared HTTP client for sub-class action methods (POST/PATCH/DELETE).
  ApiClient get api => _api;

  /// The collection route, e.g. `/infos`. Overridden per feed.
  String get resourcePath;

  /// Extra query params merged into every list request (filters, sort…).
  Map<String, dynamic> get baseQuery => const {};

  /// Decode a single `{data, meta}` page. Cursor feeds use [Page.cursor].
  Page<T> decodePage(Map<String, dynamic> json);

  AsyncStatus status = AsyncStatus.idle;
  List<T> items = const [];
  ApiError? error;

  String? _nextCursor;
  bool loadingMore = false;

  bool get isReady => status == AsyncStatus.ready;
  bool get isLoading => status == AsyncStatus.loading;
  bool get isError => status == AsyncStatus.error;
  bool get hasMore => _nextCursor != null;

  /// (Re)loads the first page. When already [ready] and [refresh] is false it
  /// is a no-op, so screens can call it from `initState` idempotently.
  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (!refresh && status == AsyncStatus.ready) return;
    status = AsyncStatus.loading;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get(resourcePath, query: {'limitRaw': 20, ...baseQuery});
      final page = decodePage(json);
      items = page.items;
      _nextCursor = page.nextCursor;
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    } catch (_) {
      error = null;
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  /// Appends the page after the current cursor; safe to call repeatedly.
  Future<void> loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null || loadingMore || status != AsyncStatus.ready) return;
    loadingMore = true;
    notifyListeners();
    try {
      final json = await _api
          .get(resourcePath, query: {'cursor': cursor, 'limitRaw': 20, ...baseQuery});
      final page = decodePage(json);
      items = [...items, ...page.items];
      _nextCursor = page.nextCursor;
    } on ApiError catch (e) {
      error = e;
    } catch (_) {
      // keep the existing page on a failed "load more"; swallow quietly
    } finally {
      loadingMore = false;
      notifyListeners();
    }
  }

  /// Re-fetch after a filter change (drops the accumulated pages).
  Future<void> reload() => load(refresh: true);

  /// Best-effort single-item fetch (detail endpoints).
  Future<T?> fetchOne(String id) async {
    try {
      final json = await _api.get('$resourcePath/$id');
      final obj = unwrapObject(json);
      if (obj.isEmpty) return null;
      final items = decodePage({
        'data': [obj],
        'meta': const <String, dynamic>{},
      }).items;
      // Guard `.first`: an empty decode must be a null result, not a thrown
      // StateError that ripples out to callers expecting only ApiError.
      return items.isEmpty ? null : items.first;
    } on ApiError {
      return null;
    }
  }

  /// Replace/insert [item] in the list by identity, used after an action so the
  /// optimistic/server result repaints without a full reload. [sameId] decides
  /// the match. No-op when [item] isn't present (e.g. it's a new detail).
  void upsert(T item, bool Function(T other) sameId) {
    final idx = items.indexWhere(sameId);
    if (idx == -1) return;
    items = [...items]..[idx] = item;
    notifyListeners();
  }

  void removeWhere(bool Function(T other) test) {
    items = items.where((e) => !test(e)).toList();
    notifyListeners();
  }

  /// Convenience for action methods: run [body], map an [ApiError] into [error].
  /// The body may return null (e.g. an unexpected envelope) without throwing.
  Future<R?> guard<R>(Future<R?> Function() body) async {
    try {
      return await body();
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return null;
    }
  }
}
