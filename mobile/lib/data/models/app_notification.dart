import '../remote/json_utils.dart';

enum NotificationType { reviewResult, commentReply, connection, system, reportResult, identityChange, broadcast }

class AppNotification {
  final String id;
  final String recipientId;
  final NotificationType type;
  final String title;
  final String body;
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic>? payload;

  AppNotification({
    required this.id,
    required this.recipientId,
    required this.type,
    required this.title,
    required this.body,
    this.read = false,
    this.payload,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  AppNotification copyWith({
    String? id,
    String? recipientId,
    NotificationType? type,
    String? title,
    String? body,
    bool? read,
    Map<String, dynamic>? payload,
    DateTime? createdAt,
  }) {
    return AppNotification(
      id: id ?? this.id,
      recipientId: recipientId ?? this.recipientId,
      type: type ?? this.type,
      title: title ?? this.title,
      body: body ?? this.body,
      read: read ?? this.read,
      payload: payload ?? this.payload,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /notifications*` row (§6.12). `read` is derived from `read_at`.
  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: asId(j['id']),
        recipientId: asId(j['recipient_id']),
        type: enumFromWire(NotificationType.values, j['type'], fallback: NotificationType.system),
        title: asString(j['title']),
        body: asString(j['body']),
        read: j['read_at'] != null,
        payload: (j['payload'] as Map?)?.cast<String, dynamic>(),
        createdAt: asDate(j['created_at']),
      );

  /// The person behind the notification, when it has one (connection asks,
  /// comment replies, mentorship events). Read from `payload.actor`
  /// (`{id, name, avatar_url}`), which senders embed so the inbox can show the
  /// avatar without a second round-trip. Null for system/broadcast rows.
  ({String id, String name, String? avatarUrl})? get actor {
    final a = payload?['actor'];
    if (a is! Map) return null;
    final m = a.cast<String, dynamic>();
    final id = asId(m['id']);
    final name = asString(m['name']);
    if (id.isEmpty && name.isEmpty) return null;
    return (id: id, name: name, avatarUrl: asStringOrNull(m['avatar_url']));
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'recipient_id': recipientId,
        'type': enumToWire(type),
        'title': title,
        'body': body,
        'read_at': read ? createdAt.toIso8601String() : null,
        'payload': payload,
        'created_at': createdAt.toIso8601String(),
      };
}
