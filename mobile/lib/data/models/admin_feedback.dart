import '../remote/json_utils.dart';

/// §6.15/§6.17 admin view of a feedback thread. The triage console needs the
/// submitter (`GET /admin/feedback` nests a `user` object) and the handling
/// metadata (`reply`/`status` writes stamp `handled_at`). The end-user's own
/// threads use the leaner [Feedback] model instead.
class AdminFeedback {
  final String id;
  final String content;
  final String? reply;

  /// `open` | `answered` | `closed`.
  final String status;
  final DateTime createdAt;
  final DateTime? handledAt;
  final String userId;
  final String userName;

  AdminFeedback({
    required this.id,
    required this.content,
    this.reply,
    this.status = 'open',
    DateTime? createdAt,
    this.handledAt,
    required this.userId,
    this.userName = '',
  }) : createdAt = createdAt ?? DateTime.now();

  bool get isOpen => status == 'open';
  bool get isClosed => status == 'closed';

  factory AdminFeedback.fromJson(Map<String, dynamic> j) {
    final user = (j['user'] as Map?)?.cast<String, dynamic>();
    return AdminFeedback(
      id: asId(j['id']),
      content: asString(j['content']),
      reply: asStringOrNull(j['reply']),
      status: asStringOrNull(j['status']) ?? 'open',
      createdAt: asDate(j['created_at']),
      handledAt: asDateOrNull(j['handled_at']),
      userId: asId(user?['id'] ?? j['user_id']),
      userName: asString(user?['name']),
    );
  }
}
