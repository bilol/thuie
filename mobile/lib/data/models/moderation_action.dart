import '../remote/json_utils.dart';
import 'enums.dart';
import 'report.dart' show targetTypeFromWire, targetTypeToWire;

/// One entry in a content item's moderation audit trail (maps to the backend
/// `moderation_actions` table). Shared across info / post / comment / profile.
class ModerationAction {
  final String id;
  final TargetType targetType;
  final String targetId;
  final String actorName; // '系统' for automatic keyword-engine actions
  final String actorId;
  final String action;   // submitted / approved / rejected / resubmitted / takenDown
  final String reason;
  final DateTime createdAt;

  ModerationAction({
    required this.id,
    required this.targetType,
    required this.targetId,
    required this.actorName,
    required this.action,
    this.actorId = '',
    this.reason = '',
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  /// `GET /admin/moderation-history/:type/:id` row (§6.17). The entity carries
  /// only `actor_id`; a nested `actor.name` is used when the view provides it.
  factory ModerationAction.fromJson(Map<String, dynamic> j) {
    final actor = (j['actor'] as Map?)?.cast<String, dynamic>();
    return ModerationAction(
      id: asId(j['id']),
      targetType: targetTypeFromWire(j['target_type']),
      targetId: asId(j['target_id']),
      actorName: asString(actor?['name']),
      actorId: asId(actor?['id'] ?? j['actor_id']),
      action: asString(j['action']),
      reason: asString(j['reason']),
      createdAt: asDate(j['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'target_type': targetTypeToWire(targetType),
        'target_id': targetId,
        'actor_id': actorId,
        'action': action,
        'reason': reason,
        'created_at': createdAt.toIso8601String(),
      };
}
