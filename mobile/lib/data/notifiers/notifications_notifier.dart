import 'dart:async';

import '../models.dart';
import '../remote/page.dart';
import '../remote/ws_client.dart';
import 'paginated_notifier.dart';

/// `GET /notifications` + read markers (§6.13). All routes are `me`-scoped by
/// the token. In-app delivery is REST now; the WS `notification:new` event
/// (§9) prepends onto this list.
class NotificationsNotifier extends PaginatedNotifier<AppNotification> {
  NotificationsNotifier({WsClient? ws}) : _ws = ws {
    _sub = _ws?.events.listen((e) {
      if (e.type != WsEventType.notificationNew) return;
      final row = AppNotification.fromJson(e.data);
      if (row.id.isEmpty) return;
      ingest(row);
    });
  }

  final WsClient? _ws;
  StreamSubscription<WsEvent>? _sub;

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  String get resourcePath => '/notifications';

  /// When true the feed is filtered to unread only.
  bool unreadOnly = false;

  @override
  Map<String, dynamic> get baseQuery => {
        if (unreadOnly) 'unread': '1',
      };

  @override
  Page<AppNotification> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, AppNotification.fromJson);

  int get unreadCount => items.where((n) => !n.read).length;

  Future<void> setUnreadOnly(bool value) async {
    if (unreadOnly == value) return;
    unreadOnly = value;
    await reload();
  }

  /// `POST /notifications/:id/read` — server returns the updated row.
  Future<void> markRead(String id) async {
    final r = await guard(() => api.post('/notifications/$id/read'));
    if (r != null) {
      final idx = items.indexWhere((n) => n.id == id);
      if (idx != -1) {
        items = [...items]..[idx] = items[idx].copyWith(read: true);
        notifyListeners();
      }
    }
  }

  /// `POST /notifications/read-all`.
  Future<bool> markAllRead() async {
    final r = await guard(() => api.post('/notifications/read-all'));
    if (r != null) {
      items = items.map((n) => n.copyWith(read: true)).toList();
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Prepend a realtime `notification:new` payload (Layer 5 hooks this).
  void ingest(AppNotification notification) {
    items = [notification, ...items];
    notifyListeners();
  }
}
