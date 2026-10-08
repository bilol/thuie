import '../remote/json_utils.dart';
import 'enums.dart';
import 'report.dart' show targetTypeFromWire;

/// A row of `GET /admin/review` (§6.17) — a pending submission of one of the
/// four moderation target types. The queue collapses infos / forum posts /
/// comments / alumni profiles into a single shape keyed by `target_type`, so the
/// admin screens route approve/reject by [targetType] + [targetId].
class ReviewItem {
  final String targetType; // wire: info_post | forum_post | comment | alumni_profile
  final String targetId;
  final String title;
  final DateTime submittedAt;
  final String authorId;
  final String authorName;
  final Role authorRole;

  const ReviewItem({
    required this.targetType,
    required this.targetId,
    required this.title,
    required this.submittedAt,
    this.authorId = '',
    this.authorName = '',
    this.authorRole = Role.student,
  });

  /// Short [TargetType] the shared UI components (badges, moderation history)
  /// understand, derived from the wire `target_type`.
  TargetType get targetTypeShort => targetTypeFromWire(targetType);

  factory ReviewItem.fromJson(Map<String, dynamic> j) {
    final author = (j['author'] as Map?)?.cast<String, dynamic>();
    return ReviewItem(
      targetType: asString(j['target_type']),
      targetId: asId(j['target_id']),
      title: asString(j['title']),
      submittedAt: asDate(j['submitted_at']),
      authorId: asId(author?['id']),
      authorName: asString(author?['name']),
      authorRole: enumFromWire(Role.values, author?['role'], fallback: Role.student),
    );
  }
}
