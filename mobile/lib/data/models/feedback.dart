import '../remote/json_utils.dart';

class Feedback {
  final String id;
  final String userId;
  final String content;
  final String? reply;
  final bool handled;
  final DateTime createdAt;

  Feedback({
    required this.id,
    required this.userId,
    required this.content,
    this.reply,
    this.handled = false,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Feedback copyWith({
    String? id,
    String? userId,
    String? content,
    String? reply,
    bool? handled,
    DateTime? createdAt,
  }) {
    return Feedback(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      content: content ?? this.content,
      reply: reply ?? this.reply,
      handled: handled ?? this.handled,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `POST /feedback` / `GET /admin/feedback` row (§6.12). `handled` reflects a
  /// non-`open` status.
  factory Feedback.fromJson(Map<String, dynamic> j) => Feedback(
        id: asId(j['id']),
        userId: asId(j['user_id']),
        content: asString(j['content']),
        reply: asStringOrNull(j['reply']),
        handled: asString(j['status']) != 'open' && j['status'] != null,
        createdAt: asDate(j['created_at']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'content': content,
        'reply': reply,
        'status': handled ? 'answered' : 'open',
        'created_at': createdAt.toIso8601String(),
      };
}
