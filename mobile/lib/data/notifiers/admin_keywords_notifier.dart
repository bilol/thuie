import 'package:flutter/foundation.dart';

import '../models/keyword.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';

/// §6.17 keyword-dictionary CRUD. `GET /admin/keywords` returns the full list
/// (a bare array, un-paginated); writes are `POST` / `PATCH :id` / `DELETE :id`
/// and the server busts its keyword cache on each. A failed write surfaces the
/// mapped [ApiError] via [error] so the screen can show the stable `code`.
class AdminKeywordsNotifier extends ChangeNotifier {
  AdminKeywordsNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;

  AsyncStatus status = AsyncStatus.idle;
  List<Keyword> keywords = const [];
  ApiError? error;

  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (!refresh && status == AsyncStatus.ready) return;
    status = AsyncStatus.loading;
    error = null;
    notifyListeners();
    try {
      final json = await _api.getList('/admin/keywords');
      keywords = Page.list(json, Keyword.fromJson).items;
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    } catch (_) {
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  /// `POST /admin/keywords` — [action] ∈ block | manual_review.
  Future<bool> create(String word, KeywordAction action, {bool enabled = true}) async {
    final r = await _guard(() => _api.post('/admin/keywords', data: {
          'word': word,
          'action': enumToWire(action),
          'enabled': enabled,
        }));
    if (r != null) {
      await load(refresh: true);
      return true;
    }
    return false;
  }

  /// `PATCH /admin/keywords/:id` — toggle action/enabled.
  Future<bool> update(String id, {KeywordAction? action, bool? enabled}) async {
    final r = await _guard(() => _api.patch('/admin/keywords/$id', data: {
          if (action != null) 'action': enumToWire(action),
          if (enabled != null) 'enabled': enabled,
        }));
    if (r != null) {
      await load(refresh: true);
      return true;
    }
    return false;
  }

  /// `DELETE /admin/keywords/:id`.
  Future<bool> remove(String id) async {
    final r = await _guard(() => _api.delete('/admin/keywords/$id'));
    if (r != null) {
      keywords = keywords.where((k) => k.id != id).toList();
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<Map<String, dynamic>?> _guard(
      Future<Map<String, dynamic>> Function() body) async {
    try {
      return await body();
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return null;
    }
  }
}
