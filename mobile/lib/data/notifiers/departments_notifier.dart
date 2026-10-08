import 'package:flutter/foundation.dart';

import '../models.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/page.dart';

/// Loads the public department registry (`GET /departments`, BACKEND.md §6.3).
/// A single non-paginated fetch shared by the register / profile pickers.
class DepartmentsNotifier extends ChangeNotifier {
  DepartmentsNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;

  AsyncStatus status = AsyncStatus.idle;
  List<Department> items = const [];
  ApiError? error;

  bool get isReady => status == AsyncStatus.ready;

  /// Fetches once unless already loaded; pass [refresh] to force a re-pull.
  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (refresh || items.isEmpty) {
      status = AsyncStatus.loading;
      error = null;
      notifyListeners();
    }
    try {
      final json = await _api.get('/departments');
      items = Page.cursor(json, Department.fromJson).items;
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

  Department? byId(String id) {
    for (final d in items) {
      if (d.id == id) return d;
    }
    return null;
  }
}
