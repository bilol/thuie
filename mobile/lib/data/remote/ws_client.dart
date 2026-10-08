import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as sio;

import 'api_config.dart';

/// The realtime (§9) event kinds the gateway pushes, normalized into a small
/// enum so feature notifiers can switch without stringly-typed guesses.
enum WsEventType {
  messageNew,
  messageRead,
  typingStart,
  typingStop,
  notificationNew,
  presenceUpdate,
  moderationStatus,
  connected,
  disconnected,
}

/// A decoded realtime event: [data] is the server payload map (empty for the
/// lifecycle events).
class WsEvent {
  final WsEventType type;
  final Map<String, dynamic> data;
  const WsEvent(this.type, this.data);
}

/// Socket.IO client for the `/realtime` namespace (BACKEND.md §9). REST stays
/// the source of truth — this only delivers increments and echoes the client's
/// own typing/room membership. It authenticates with the live access JWT passed
/// in the handshake `auth` (and `?token=` as a fallback the gateway also reads).
class WsClient {
  sio.Socket? _socket;
  final StreamController<WsEvent> _controller =
      StreamController<WsEvent>.broadcast();

  /// Broadcast stream of decoded realtime events; feature notifiers listen.
  Stream<WsEvent> get events => _controller.stream;

  bool get isConnected => _socket?.connected ?? false;

  String? _token;

  /// Idempotent auth hook (called from the composition root on every session
  /// change): connects with a fresh [token], reconnects when the token rotates,
  /// and disconnects on sign-out — without tearing the socket down on no-ops.
  void sync(String? token) {
    final signedIn = token != null && token.isNotEmpty;
    if (!signedIn) {
      if (_token != null) disconnect();
      _token = null;
      return;
    }
    if (_token == token && isConnected) return;
    connect(token);
  }

  /// (Re)opens the socket for [token]. Calling it again with a fresh token
  /// (e.g. after a refresh or sign-in) tears down the previous socket first.
  void connect(String token) {
    _socket?.dispose();
    final socket = sio.io('${ApiConfig.realtimeUrl}/realtime', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'reconnection': true,
      'auth': {'token': token},
      'query': {'token': token},
    });

    socket.on('connect', (_) => _dispatch(WsEventType.connected, const {}));
    socket.on('disconnect', (_) => _dispatch(WsEventType.disconnected, const {}));
    socket.on('message:new', (d) => _dispatch(WsEventType.messageNew, d));
    socket.on('message:read', (d) => _dispatch(WsEventType.messageRead, d));
    socket.on('typing:start', (d) => _dispatch(WsEventType.typingStart, d));
    socket.on('typing:stop', (d) => _dispatch(WsEventType.typingStop, d));
    socket.on('notification:new', (d) => _dispatch(WsEventType.notificationNew, d));
    socket.on('presence:update', (d) => _dispatch(WsEventType.presenceUpdate, d));
    socket.on('moderation:status', (d) => _dispatch(WsEventType.moderationStatus, d));

    socket.connect();
    _socket = socket;
    _token = token;
  }

  /// The gateway only lets a socket join a room it is already a member of; the
  /// server auto-joins every `conv:<id>` on connect, so this is best-effort for
  /// late opens after a reconnection.
  void joinConversation(String id) =>
      _socket?.emit('conversation:join', {'conversationId': id});

  void leaveConversation(String id) =>
      _socket?.emit('conversation:leave', {'conversationId': id});

  void typingStart(String id) =>
      _socket?.emit('typing:start', {'conversationId': id});

  void typingStop(String id) =>
      _socket?.emit('typing:stop', {'conversationId': id});

  /// Closes the socket, keeping the event stream open for reuse across sign-ins.
  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _token = null;
  }

  Future<void> dispose() async {
    _socket?.dispose();
    _socket = null;
    await _controller.close();
  }

  void _dispatch(WsEventType type, dynamic raw) {
    if (_controller.isClosed) return;
    final data = raw is Map
        ? Map<String, dynamic>.from(raw)
        : <String, dynamic>{};
    _controller.add(WsEvent(type, data));
  }
}
