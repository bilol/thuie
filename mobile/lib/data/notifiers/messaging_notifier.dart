import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/conversation.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import '../remote/ws_client.dart';

/// §6.8 messaging over REST, with the §9 realtime socket layered on top for
/// live increments. Replaces the old in-memory `MessagingRepo`: the inbox is a
/// cursor feed (`GET /conversations`), each conversation lazy-loads a page-back
/// message history, and writes go through the authenticated [ApiClient] so the
/// server owns ordering, read state and moderation. A single [WsClient] (shared
/// with the notifications feed) pushes `message:new` / `message:read` /
/// `typing:*` / `presence:update`, which are folded into the caches here.
class MessagingNotifier extends ChangeNotifier {
  MessagingNotifier({ApiClient? api, WsClient? ws})
      : _api = api ?? ApiClient.instance,
        _ws = ws {
    _sub = _ws?.events.listen(_onEvent);
  }

  final ApiClient _api;
  final WsClient? _ws;
  StreamSubscription<WsEvent>? _sub;

  static const int _pageSize = 30;

  // --------------------------------------------------------------- inbox ----

  AsyncStatus status = AsyncStatus.idle;
  ApiError? error;
  List<Conversation> conversations = const [];
  String? _inboxCursor;
  bool _loadingMoreInbox = false;

  bool get isLoadingInbox => status == AsyncStatus.loading;
  bool get hasMoreInbox => _inboxCursor != null;
  int get totalUnread => conversations.fold(0, (sum, c) => sum + c.unreadCount);

  Conversation? conversationById(String id) {
    for (final c in conversations) {
      if (c.id == id) return c;
    }
    return null;
  }

  /// Loads (or refreshes) the inbox page one. No-op when already [ready] and
  /// [refresh] is false, so screens can call it from `initState` idempotently.
  Future<void> loadInbox({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (!refresh && status == AsyncStatus.ready) return;
    status = AsyncStatus.loading;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/conversations', query: {'limitRaw': 20});
      final page = Page.cursor(json, Conversation.fromJson);
      conversations = page.items;
      _inboxCursor = page.nextCursor;
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    } catch (_) {
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  Future<void> loadMoreInbox() async {
    final cursor = _inboxCursor;
    if (cursor == null || _loadingMoreInbox || status != AsyncStatus.ready) return;
    _loadingMoreInbox = true;
    try {
      final json = await _api.get('/conversations', query: {'cursor': cursor, 'limitRaw': 20});
      final page = Page.cursor(json, Conversation.fromJson);
      conversations = [...conversations, ...page.items];
      _inboxCursor = page.nextCursor;
    } on ApiError catch (e) {
      error = e;
    } finally {
      _loadingMoreInbox = false;
      notifyListeners();
    }
  }

  // ------------------------------------------------------------- messages ----

  final Map<String, List<ChatMessage>> _messages = {};
  final Map<String, String?> _messageCursor = {};
  final Set<String> _loadingMoreMessages = {};

  /// Chronological (oldest → newest) history for an opened conversation.
  List<ChatMessage> messagesOf(String conversationId) =>
      _messages[conversationId] ?? const [];

  bool get isLoadingMessages => _messages.isEmpty;
  bool hasMoreMessages(String conversationId) =>
      _messageCursor.containsKey(conversationId) &&
      _messageCursor[conversationId] != null;

  /// Opens a conversation: joins its realtime room and pulls the newest page
  /// (the server returns it newest-first; we store it chronologically).
  Future<void> openConversation(String conversationId, {bool force = false}) async {
    _ws?.joinConversation(conversationId);
    if (!force && _messages.containsKey(conversationId)) return;
    try {
      final json = await _api.get('/conversations/$conversationId/messages',
          query: {'limitRaw': _pageSize, 'order': 'desc'});
      final page = Page.cursor(json, ChatMessage.fromJson);
      _messages[conversationId] = page.items.reversed.toList();
      _messageCursor[conversationId] = page.nextCursor;
      notifyListeners();
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
    }
  }

  /// Page-back: fetch the next (older) batch and prepend it.
  Future<void> loadMoreMessages(String conversationId) async {
    final cursor = _messageCursor[conversationId];
    if (cursor == null || _loadingMoreMessages.contains(conversationId)) return;
    _loadingMoreMessages.add(conversationId);
    try {
      final json = await _api.get('/conversations/$conversationId/messages',
          query: {'limitRaw': _pageSize, 'order': 'desc', 'cursor': cursor});
      final page = Page.cursor(json, ChatMessage.fromJson);
      _messages[conversationId] = [
        ...page.items.reversed,
        ...(_messages[conversationId] ?? const []),
      ];
      _messageCursor[conversationId] = page.nextCursor;
    } on ApiError catch (e) {
      error = e;
    } finally {
      _loadingMoreMessages.remove(conversationId);
      notifyListeners();
    }
  }

  Future<void> closeConversation(String conversationId) async {
    _ws?.leaveConversation(conversationId);
  }

  // ---------------------------------------------------------------- write ----

  /// `POST /conversations` DM. Idempotent: the server dedupes on `pair_key`, so
  /// this doubles as "conversationWith" — it returns the (existing or new) DM.
  Future<Conversation?> createDirect(String otherUserId) async {
    final r = await _guard(() => _api.post('/conversations',
        data: {'participant_id': otherUserId}));
    if (r == null) return null;
    final created = Conversation.fromJson(unwrapObject(r));
    _upsertConversation(created, moveTop: false);
    notifyListeners();
    return created;
  }

  /// Convenience for the "Message" buttons: opens (or reuses) a DM and returns
  /// its conversation id, or null when creation was rejected (blocked/unverified).
  Future<String?> conversationWith(String otherUserId) async =>
      (await createDirect(otherUserId))?.id;

  /// `POST /conversations` for a group (`participant_ids`, optional `title`).
  Future<Conversation?> createGroup(List<String> memberIds, {String? title}) async {
    final r = await _guard(() => _api.post('/conversations', data: {
          'participant_ids': memberIds,
          if (title != null && title.isNotEmpty) 'title': title,
        }));
    if (r == null) return null;
    final created = Conversation.fromJson(unwrapObject(r));
    _upsertConversation(created, moveTop: false);
    notifyListeners();
    return created;
  }

  /// `POST /conversations/:id/messages`. The server echoes the stored row (and
  /// the socket rebroadcasts it), so we fold in the result by id — dedup-safe.
  Future<ChatMessage?> send(String conversationId, String content,
      {String? mediaId}) async {
    final r = await _guard(() => _api.post('/conversations/$conversationId/messages',
        data: {
          'content': content,
          if (mediaId != null) 'media_id': mediaId,
        }));
    if (r == null) return null;
    final sent = ChatMessage.fromJson(unwrapObject(r));
    _appendMessage(sent);
    _bumpInbox(sent);
    return sent;
  }

  /// `DELETE /conversations/:id/messages/:messageId` — soft-delete the caller's
  /// own message (the server clears `content` and stamps `deleted_at`; it only
  /// allows the sender). Mirror the tombstone locally so the bubble flips
  /// without a re-fetch.
  Future<bool> deleteMessage(String conversationId, String messageId) async {
    final r = await _guard(() => _api
        .delete('/conversations/$conversationId/messages/$messageId'));
    if (r == null) return false;
    final list = _messages[conversationId];
    if (list != null) {
      _messages[conversationId] = [
        for (final m in list)
          m.id == messageId
              ? ChatMessage(
                  id: m.id,
                  conversationId: m.conversationId,
                  sender: m.sender,
                  deleted: true,
                  sentAt: m.sentAt,
                  editedAt: m.editedAt,
                )
              : m,
      ];
      notifyListeners();
    }
    return true;
  }

  /// `POST /conversations/:id/read` — clears the viewer's unread for the thread.
  Future<void> markRead(String conversationId) async {
    final r = await _guard(
        () => _api.post('/conversations/$conversationId/read', data: {}));
    if (r == null) return;
    conversations = conversations
        .map((c) => c.id == conversationId ? c.copyWith(unreadCount: 0) : c)
        .toList();
    notifyListeners();
  }

  /// `PATCH /conversations/:id` — caller's mute/pin flags.
  Future<bool> setFlags(String conversationId, {bool? muted, bool? pinned}) async {
    final r = await _guard(() => _api.patch('/conversations/$conversationId',
        data: {
          if (muted != null) 'muted': muted,
          if (pinned != null) 'pinned': pinned,
        }));
    if (r == null) return false;
    final idx = conversations.indexWhere((c) => c.id == conversationId);
    if (idx != -1) {
      final c = conversations[idx];
      final next = c.copyWith(
        muted: r.containsKey('muted') ? asBool(r['muted'], orElse: c.muted) : c.muted,
        pinned: r.containsKey('pinned') ? asBool(r['pinned'], orElse: c.pinned) : c.pinned,
      );
      conversations = [...conversations]..[idx] = next;
      notifyListeners();
    }
    return true;
  }

  /// `POST /conversations/:id/participants` (group only).
  Future<bool> addParticipants(String conversationId, List<String> userIds) async {
    final r = await _guard(() => _api.post('/conversations/$conversationId/participants',
        data: {'user_ids': userIds}));
    return r != null;
  }

  /// `DELETE /conversations/:id/participants/:userId` (group only).
  Future<bool> removeParticipant(String conversationId, String userId) async {
    final r = await _guard(
        () => _api.delete('/conversations/$conversationId/participants/$userId'));
    return r != null;
  }

  /// `POST /conversations/:id/leave` — drops the caller from the thread.
  Future<bool> leave(String conversationId) async {
    final r = await _guard(() => _api.post('/conversations/$conversationId/leave'));
    if (r != null) {
      conversations = conversations.where((c) => c.id != conversationId).toList();
      notifyListeners();
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- typing ----

  final Map<String, Set<String>> _typing = {};
  final Map<String, Timer> _typingTimers = {};
  final Map<String, Timer> _outgoingTyping = {};

  /// userIds currently typing in [conversationId] (never the viewer's own echo,
  /// which the server already excludes).
  Set<String> typingIn(String conversationId) => _typing[conversationId] ?? const {};

  /// Emits `typing:start` and self-schedules a `typing:stop` so the peer
  /// indicator clears even if the viewer stops keystroking without sending.
  void sendTyping(String conversationId) {
    _ws?.typingStart(conversationId);
    _outgoingTyping.remove(conversationId)?.cancel();
    _outgoingTyping[conversationId] = Timer(const Duration(seconds: 3), () {
      _ws?.typingStop(conversationId);
      _outgoingTyping.remove(conversationId);
    });
  }

  // --------------------------------------------------------------- presence ----

  final Map<String, bool> _presence = {};
  bool isOnline(String userId) => _presence[userId] ?? false;

  // ----------------------------------------------------------------- ws ----

  bool _everConnected = false;

  void _onEvent(WsEvent e) {
    switch (e.type) {
      case WsEventType.messageNew:
        final raw = e.data['message'];
        if (raw is! Map) return;
        final msg = ChatMessage.fromJson(Map<String, dynamic>.from(raw));
        _appendMessage(msg);
        _bumpInbox(msg);
        break;
      case WsEventType.messageRead:
        // Read receipts are per-participant; the inbox unread counter refreshes
        // on the next load, so there is nothing optimistic to fold in here.
        break;
      case WsEventType.typingStart:
        _applyTyping(e.data, true);
        break;
      case WsEventType.typingStop:
        _applyTyping(e.data, false);
        break;
      case WsEventType.presenceUpdate:
        _presence[asId(e.data['userId'])] = asBool(e.data['isOnline']);
        notifyListeners();
        break;
      case WsEventType.connected:
        // On a (re)connect the socket may have missed increments while down;
        // replay by re-pulling the inbox (and any open thread) from REST (§9).
        if (_everConnected) {
          loadInbox(refresh: true);
          for (final id in _messages.keys.toList()) {
            openConversation(id, force: true);
          }
        }
        _everConnected = true;
        break;
      case WsEventType.disconnected:
      case WsEventType.notificationNew:
      case WsEventType.moderationStatus:
        break; // notifications/moderation are consumed by their own notifiers
    }
  }

  void _applyTyping(Map<String, dynamic> data, bool typing) {
    final convId = asId(data['conversationId']);
    final userId = asId(data['userId']);
    if (convId.isEmpty || userId.isEmpty) return;
    final set = {...(_typing[convId] ?? const <String>{})};
    if (typing) {
      set.add(userId);
      _typingTimers.remove(convId)?.cancel();
      _typingTimers[convId] =
          Timer(const Duration(seconds: 4), () => _clearTyping(convId, userId));
    } else {
      set.remove(userId);
    }
    _typing[convId] = set;
    notifyListeners();
  }

  void _clearTyping(String convId, String userId) {
    final set = {...(_typing[convId] ?? const <String>{})}..remove(userId);
    _typing[convId] = set;
    notifyListeners();
  }

  // -------------------------------------------------------------- helpers ----

  void _appendMessage(ChatMessage msg) {
    final list = _messages[msg.conversationId];
    if (list == null) return; // only cache into an already-open thread
    if (list.any((m) => m.id == msg.id)) return; // dedupe send-echo vs socket
    _messages[msg.conversationId] = [...list, msg];
    notifyListeners();
  }

  /// Moves (or refreshes) the conversation to the top with a new preview, mirroring
  /// the server's `last_message_at` ordering. Unread stays authoritative on reload.
  void _bumpInbox(ChatMessage msg) {
    final idx = conversations.indexWhere((c) => c.id == msg.conversationId);
    if (idx == -1) {
      // A thread we don't have cached yet (e.g. first-ever DM): pull the inbox.
      loadInbox(refresh: true);
      return;
    }
    final conv = conversations[idx];
    final updated = conv.copyWith(
      lastMessageAt: msg.sentAt,
      lastMessage: LastMessagePreview(
        id: msg.id,
        content: msg.content,
        deleted: msg.deleted,
        senderId: msg.sender?.id ?? '',
        sentAt: msg.sentAt,
      ),
    );
    final rest = [...conversations]..removeAt(idx);
    conversations = [updated, ...rest];
    notifyListeners();
  }

  void _upsertConversation(Conversation conv, {bool moveTop = true}) {
    final idx = conversations.indexWhere((c) => c.id == conv.id);
    if (idx == -1) {
      conversations = moveTop
          ? [conv, ...conversations]
          : [...conversations, conv];
      return;
    }
    conversations = [...conversations]..[idx] = conv;
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

  @override
  void dispose() {
    for (final t in _typingTimers.values) {
      t.cancel();
    }
    for (final t in _outgoingTyping.values) {
      t.cancel();
    }
    _sub?.cancel();
    super.dispose();
  }
}
