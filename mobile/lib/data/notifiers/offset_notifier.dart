import 'package:flutter/foundation.dart';

import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/page.dart';

/// Base for the admin console's offset-paginated tables (§6.17): review,
/// reports, users and operation logs all use `?page=&limitRaw=` + a
/// `{data, meta:{page,total,totalPages}}` envelope rather than the keyset
/// cursors the end-user feeds use. Mirrors [PaginatedNotifier]'s lifecycle but
/// pages by number instead of an opaque cursor.
abstract class OffsetNotifier<T> extends ChangeNotifier {
  OffsetNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;
  ApiClient get api => _api;

  /// The collection route, e.g. `/admin/review`.
  String get resourcePath;

  /// Filters merged into every list request (type/status/role/q…).
  Map<String, dynamic> get baseQuery => const {};

  /// Decode one page. Defaults to the offset envelope; override for the odd
  /// shapes (e.g. `/admin/reports` which returns `{rows,total}` directly).
  Page<T> decodePage(Map<String, dynamic> json) =>
      Page.offset(json, decodeRow);

  /// Decode a single row.
  T decodeRow(Map<String, dynamic> json);

  AsyncStatus status = AsyncStatus.idle;
  List<T> items = const [];
  ApiError? error;

  int page = 1;
  int? total;
  int? totalPages;
  bool loadingMore = false;

  bool get isReady => status == AsyncStatus.ready;
  bool get isLoading => status == AsyncStatus.loading;
  bool get isError => status == AsyncStatus.error;
  bool get hasMorePages =>
      totalPages != null && page < totalPages!;

  /// Loads (or refreshes) page one. Idempotent no-op when already [isReady] and
  /// [refresh] is false, so screens can call it from `initState`.
  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (!refresh && status == AsyncStatus.ready) return;
    status = AsyncStatus.loading;
    error = null;
    page = 1;
    notifyListeners();
    try {
      final json =
          await _api.get(resourcePath, query: {'page': 1, 'limitRaw': 20, ...baseQuery});
      final result = decodePage(json);
      items = result.items;
      page = result.page ?? 1;
      total = result.total;
      totalPages = result.totalPages;
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    } catch (_) {
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  /// Appends the next page; safe to call repeatedly.
  Future<void> loadMore() async {
    if (!hasMorePages || loadingMore || status != AsyncStatus.ready) return;
    loadingMore = true;
    notifyListeners();
    try {
      final next = page + 1;
      final json = await _api.get(
          resourcePath, query: {'page': next, 'limitRaw': 20, ...baseQuery});
      final result = decodePage(json);
      items = [...items, ...result.items];
      page = result.page ?? next;
      total = result.total ?? total;
      totalPages = result.totalPages ?? totalPages;
    } on ApiError catch (e) {
      error = e;
    } finally {
      loadingMore = false;
      notifyListeners();
    }
  }

  /// Re-fetch after a filter change.
  Future<void> reload() => load(refresh: true);

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
