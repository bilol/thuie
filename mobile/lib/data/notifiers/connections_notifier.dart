import 'package:flutter/foundation.dart';

import '../models.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';

/// The three connection mailbox views of `GET /connections?box=…` (§6.9).
/// * [ConnectionBox.requests] — pending requests addressed to me (I can respond).
/// * [ConnectionBox.mine]     — everything I have sent, any status.
/// * [ConnectionBox.accepted] — the mutual, accepted network.
enum ConnectionBox { requests, mine, accepted }

String _boxWire(ConnectionBox b) => switch (b) {
      ConnectionBox.requests => 'requests',
      ConnectionBox.mine => 'mine',
      ConnectionBox.accepted => 'accepted',
    };

/// `GET/POST/PATCH /connections` + `GET/POST/DELETE /me/blocks` (§6.9).
///
/// Unlike the single-list feeds, connections are queried per *box*, so this
/// keeps one cursor-paginated list per box side by side. Blocks are a flat,
/// non-paginated `{data:[brief], meta:{total}}` list and live here too.
/// Connection rows carry only the peer `user` brief (no from/to ids), so the
/// direction is inferred from the box, not the row.
class ConnectionsNotifier extends ChangeNotifier {
  ConnectionsNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;
  final ApiClient _api;

  ApiError? error;

  final Map<ConnectionBox, List<Connection>> _rows = {
    for (final b in ConnectionBox.values) b: const <Connection>[],
  };
  final Map<ConnectionBox, String?> _cursor = {
    for (final b in ConnectionBox.values) b: null,
  };
  final Map<ConnectionBox, bool> _loading = {
    for (final b in ConnectionBox.values) b: false,
  };
  final Map<ConnectionBox, bool> _loaded = {
    for (final b in ConnectionBox.values) b: false,
  };

  List<Connection> rowsOf(ConnectionBox box) => _rows[box]!;
  bool isLoading(ConnectionBox box) => _loading[box]!;
  bool hasMore(ConnectionBox box) => _cursor[box] != null;

  /// The viewer's accepted-network rows (used to derive "connected" chips).
  List<Connection> get accepted => _rows[ConnectionBox.accepted]!;

  /// Pending requests addressed to the viewer.
  List<Connection> get incoming => _rows[ConnectionBox.requests]!;

  /// Requests the viewer sent that are still pending.
  List<Connection> get outgoingPending => _rows[ConnectionBox.mine]!
      .where((c) => c.status == ConnectionStatus.pending)
      .toList();

  bool isConnectedWith(String? userId) =>
      userId != null &&
      accepted.any((c) => c.peer?.id == userId);

  bool hasPendingOutgoingTo(String? userId) =>
      userId != null &&
      outgoingPending.any((c) => c.peer?.id == userId);

  /// The pending request the viewer sent to [userId], or null. Exposed so a
  /// profile screen can *withdraw* the ask (`PATCH /connections/:id` → revoked),
  /// which needs the row id the bool-only check can't provide.
  Connection? pendingOutgoingTo(String? userId) {
    if (userId == null) return null;
    for (final c in outgoingPending) {
      if (c.peer?.id == userId) return c;
    }
    return null;
  }

  Future<void> load(ConnectionBox box, {bool refresh = false}) async {
    if (_loading[box] ?? false) return;
    if (!refresh && (_loaded[box] ?? false)) return;
    _loading[box] = true;
    error = null;
    notifyListeners();
    try {
      final json = await _api
          .get('/connections', query: {'box': _boxWire(box), 'limitRaw': 20});
      final page = Page.cursor(json, Connection.fromJson);
      _rows[box] = page.items;
      _cursor[box] = page.nextCursor;
      _loaded[box] = true;
    } on ApiError catch (e) {
      error = e;
    } finally {
      _loading[box] = false;
      notifyListeners();
    }
  }

  Future<void> loadMore(ConnectionBox box) async {
    final cursor = _cursor[box];
    if (cursor == null || (_loading[box] ?? false)) return;
    _loading[box] = true;
    notifyListeners();
    try {
      final json = await _api.get('/connections',
          query: {'box': _boxWire(box), 'cursor': cursor, 'limitRaw': 20});
      final page = Page.cursor(json, Connection.fromJson);
      _rows[box] = [..._rows[box]!, ...page.items];
      _cursor[box] = page.nextCursor;
    } on ApiError catch (e) {
      error = e;
    } finally {
      _loading[box] = false;
      notifyListeners();
    }
  }

  /// Convenience for screens that need the pending + accepted tabs together and
  /// the connect-chip membership sets (requests/mine/accepted) at once.
  Future<void> loadAll() async {
    for (final b in ConnectionBox.values) {
      await load(b, refresh: true);
    }
  }

  /// `POST /connections` — send (or, on a mutual request, accept). Returns null
  /// on error, otherwise the resulting row.
  Future<Connection?> send(String toUserId, {String? message}) async {
    try {
      final json = await _api.post('/connections', data: {
        'to_user_id': toUserId,
        if (message != null && message.isNotEmpty) 'message': message,
      });
      final created = Connection.fromJson(unwrapObject(json));
      await _invalidate();
      notifyListeners();
      return created;
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return null;
    }
  }

  /// `PATCH /connections/:id` — accept/decline a request, or revoke a pair.
  Future<bool> respond(Connection connection, ConnectionStatus status) async {
    try {
      await _api.patch('/connections/${connection.id}',
          data: {'status': enumToWire(status)});
      await _invalidate();
      notifyListeners();
      return true;
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return false;
    }
  }

  Future<void> _invalidate() async {
    for (final b in ConnectionBox.values) {
      _loaded[b] = false;
    }
    await loadAll();
  }

  // ------------------------------------------------------------------ blocks --

  List<ConnectionUser> blocks = const [];
  bool blocksLoading = false;

  /// `GET /me/blocks` — flat `{data:[brief], meta:{total}}` (no cursor).
  Future<void> loadBlocks({bool refresh = false}) async {
    if (blocksLoading) return;
    if (!refresh && blocks.isNotEmpty) return;
    blocksLoading = true;
    notifyListeners();
    try {
      final json = await _api.get('/me/blocks');
      final data = (json['data'] as List?) ?? const [];
      blocks = data
          .whereType<Map>()
          .map((e) => ConnectionUser.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on ApiError catch (e) {
      error = e;
    } finally {
      blocksLoading = false;
      notifyListeners();
    }
  }

  bool isBlocked(String? userId) =>
      userId != null && blocks.any((b) => b.id == userId);

  /// `POST /me/blocks` — sever the connection both ways + forbid DMs (§12.7).
  Future<bool> block(String userId) async {
    try {
      await _api.post('/me/blocks', data: {'user_id': userId});
      await loadBlocks(refresh: true);
      await _invalidate();
      return true;
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return false;
    }
  }

  /// `DELETE /me/blocks/:userId`.
  Future<bool> unblock(String userId) async {
    try {
      await _api.delete('/me/blocks/$userId');
      blocks = blocks.where((b) => b.id != userId).toList();
      notifyListeners();
      return true;
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return false;
    }
  }
}
