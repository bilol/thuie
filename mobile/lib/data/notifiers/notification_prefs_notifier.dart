import 'package:flutter/foundation.dart';

import '../models.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';

/// Server-synced notification mute state (`GET`/`PATCH /me/notification-preferences`,
/// BACKEND.md §6.2). The backend returns one row per known type; every toggle
/// writes straight through so a mute survives reinstall and follows the user
/// across devices, instead of living only in this screen.
class NotificationPrefsNotifier extends ChangeNotifier {
  NotificationPrefsNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;

  AsyncStatus status = AsyncStatus.idle;
  List<NotificationPreferenceItem> items = const [];
  ApiError? error;

  final Set<NotificationType> _saving = {};

  bool get isLoading => status == AsyncStatus.loading;
  bool isSaving(NotificationType type) => _saving.contains(type);

  /// Fetches once unless already loaded; pass [refresh] to force a re-pull.
  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (refresh || items.isEmpty) {
      status = AsyncStatus.loading;
      error = null;
      notifyListeners();
    }
    try {
      final json = await _api.getList('/me/notification-preferences');
      items = [
        for (final e in json)
          if (e is Map)
            NotificationPreferenceItem.fromJson(Map<String, dynamic>.from(e)),
      ];
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    } catch (_) {
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  /// `PATCH /me/notification-preferences` for a single type. [enabled] is the
  /// switch value (the inverse of the stored `muted`). Optimistic: flip locally,
  /// then roll back the row if the write fails.
  Future<void> setEnabled(NotificationType type, bool enabled) async {
    if (!items.any((i) => i.type == type)) return;
    final prev = items.firstWhere((i) => i.type == type);
    items = [
      for (final i in items)
        i.type == type
            ? NotificationPreferenceItem(type: type, muted: !enabled)
            : i,
    ];
    _saving.add(type);
    error = null;
    notifyListeners();
    try {
      await _api.patch('/me/notification-preferences',
          data: {'type': enumToWire(type), 'muted': !enabled});
    } on ApiError catch (e) {
      error = e;
      items = [for (final i in items) i.type == type ? prev : i];
    } finally {
      _saving.remove(type);
      notifyListeners();
    }
  }
}
