import '../remote/json_utils.dart';
import 'enums.dart';

/// §6.8 conversation kind. Direct DMs dedupe on the server's `pair_key`, so a
/// re-open is idempotent; groups carry several participants.
enum ConversationKind { direct, group }

/// A participant/counterpart/sender projection embedded in messaging rows
/// (`{id, name, role, avatar_url}`), the same brief the alumni/connection feeds
/// use. [avatarUrl] is a server-relative media path — resolve it before render.
class ChatUserBrief {
  final String id;
  final String name;
  final Role role;
  final String? avatarUrl;

  const ChatUserBrief({
    required this.id,
    required this.name,
    this.role = Role.student,
    this.avatarUrl,
  });

  factory ChatUserBrief.fromJson(Map<String, dynamic> j) => ChatUserBrief(
        id: asId(j['id']),
        name: asString(j['name']),
        role: enumFromWire(Role.values, j['role'], fallback: Role.student),
        avatarUrl: asStringOrNull(j['avatar_url']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'role': enumToWire(role),
        'avatar_url': avatarUrl,
      };
}

/// The stripped-down last-message preview carried on an inbox row. `content` is
/// null once the message has been deleted (§6.8 moderation).
class LastMessagePreview {
  final String id;
  final String? content;
  final bool deleted;
  final String senderId;
  final DateTime sentAt;

  const LastMessagePreview({
    required this.id,
    this.content,
    this.deleted = false,
    required this.senderId,
    required this.sentAt,
  });

  factory LastMessagePreview.fromJson(Map<String, dynamic> j) => LastMessagePreview(
        id: asId(j['id']),
        content: asStringOrNull(j['content']),
        deleted: asBool(j['deleted']),
        senderId: asId(j['sender_id']),
        sentAt: asDate(j['sent_at']),
      );
}

/// A row of `GET /conversations` (the inbox). Read/mute/pin state is per the
/// calling participant, so these are always the viewer's own flags.
class Conversation {
  final String id;
  final ConversationKind kind;
  final DateTime? lastMessageAt;
  final bool muted;
  final bool pinned;
  final int unreadCount;
  final ChatUserBrief? counterpart;
  final LastMessagePreview? lastMessage;

  const Conversation({
    required this.id,
    this.kind = ConversationKind.direct,
    this.lastMessageAt,
    this.muted = false,
    this.pinned = false,
    this.unreadCount = 0,
    this.counterpart,
    this.lastMessage,
  });

  factory Conversation.fromJson(Map<String, dynamic> j) {
    final counterpart = (j['counterpart'] as Map?)?.cast<String, dynamic>();
    final last = (j['last_message'] as Map?)?.cast<String, dynamic>();
    return Conversation(
      id: asId(j['id']),
      kind: enumFromWire(ConversationKind.values, j['kind'], fallback: ConversationKind.direct),
      lastMessageAt: asDateOrNull(j['last_message_at']),
      muted: asBool(j['muted']),
      pinned: asBool(j['pinned']),
      unreadCount: asInt(j['unread_count']),
      counterpart: counterpart == null ? null : ChatUserBrief.fromJson(counterpart),
      lastMessage: last == null ? null : LastMessagePreview.fromJson(last),
    );
  }

  Conversation copyWith({
    bool? muted,
    bool? pinned,
    int? unreadCount,
    DateTime? lastMessageAt,
    LastMessagePreview? lastMessage,
  }) =>
      Conversation(
        id: id,
        kind: kind,
        lastMessageAt: lastMessageAt ?? this.lastMessageAt,
        muted: muted ?? this.muted,
        pinned: pinned ?? this.pinned,
        unreadCount: unreadCount ?? this.unreadCount,
        counterpart: counterpart,
        lastMessage: lastMessage ?? this.lastMessage,
      );
}

/// A row of `GET /conversations/:id/messages` and the WS `message:new` payload.
/// `content` is null for a deleted message; media messages carry [mediaUrl].
class ChatMessage {
  final String id;
  final String conversationId;
  final ChatUserBrief? sender;
  final String? content;
  final bool deleted;
  final String? mediaId;
  final String? mediaUrl;
  final DateTime sentAt;
  final DateTime? editedAt;

  const ChatMessage({
    required this.id,
    required this.conversationId,
    this.sender,
    this.content,
    this.deleted = false,
    this.mediaId,
    this.mediaUrl,
    required this.sentAt,
    this.editedAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) {
    final sender = (j['sender'] as Map?)?.cast<String, dynamic>();
    return ChatMessage(
      id: asId(j['id']),
      conversationId: asId(j['conversation_id']),
      sender: sender == null ? null : ChatUserBrief.fromJson(sender),
      content: asStringOrNull(j['content']),
      deleted: asBool(j['deleted']),
      mediaId: asIdOrNull(j['media_id']),
      mediaUrl: asStringOrNull(j['media_url']),
      sentAt: asDate(j['sent_at']),
      editedAt: asDateOrNull(j['edited_at']),
    );
  }
}
