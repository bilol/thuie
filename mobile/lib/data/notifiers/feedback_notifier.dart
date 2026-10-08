import 'package:flutter/foundation.dart';

import '../models.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';

/// `POST /feedback` (submit) + `GET /me/feedback` (the caller's own threads,
/// cursor-paginated) (§6.15). Admin triage lives under `/admin/feedback` (Layer 6).
class FeedbackNotifier extends ChangeNotifier {
  FeedbackNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;
  final ApiClient _api;

  AsyncStatus status = AsyncStatus.idle;
  ApiError? error;
  List<Feedback> items = const [];
  bool loadingMore = false;
  String? _cursor;

  bool get hasMore => _cursor != null;

  /// `POST /feedback` — free-text product feedback. Returns null on error.
  Future<Feedback?> submit(String content) async {
    try {
      final json = await _api.post('/feedback', data: {'content': content});
      final created = Feedback.fromJson(unwrapObject(json));
      items = [created, ...items];
      notifyListeners();
      return created;
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return null;
    }
  }

  /// `GET /me/feedback` — the caller's submitted threads.
  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (!refresh && status == AsyncStatus.ready) return;
    status = AsyncStatus.loading;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/me/feedback', query: {'limitRaw': 20});
      final page = Page.cursor(json, Feedback.fromJson);
      items = page.items;
      _cursor = page.nextCursor;
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  Future<void> loadMore() async {
    final cursor = _cursor;
    if (cursor == null || loadingMore || status != AsyncStatus.ready) return;
    loadingMore = true;
    notifyListeners();
    try {
      final json =
          await _api.get('/me/feedback', query: {'cursor': cursor, 'limitRaw': 20});
      final page = Page.cursor(json, Feedback.fromJson);
      items = [...items, ...page.items];
      _cursor = page.nextCursor;
    } on ApiError {
      // keep the current page on a failed "load more"
    } finally {
      loadingMore = false;
      notifyListeners();
    }
  }
}
