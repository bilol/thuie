import '../remote/json_utils.dart';
import 'enums.dart';

enum ReportStatus { open, resolvedIgnored, resolvedDeleted, resolvedRestricted }

/// DB `reports.target_type` uses the entity-table names; the client collapses
/// them to the short [TargetType]. Maps both directions.
TargetType targetTypeFromWire(Object? wire) => switch (wire?.toString()) {
      'info_post' || 'info' => TargetType.info,
      'forum_post' || 'post' => TargetType.post,
      'alumni_profile' || 'profile' => TargetType.profile,
      'comment' => TargetType.comment,
      'user' => TargetType.user,
      _ => TargetType.info,
    };

String targetTypeToWire(TargetType t) => switch (t) {
      TargetType.info => 'info_post',
      TargetType.post => 'forum_post',
      TargetType.profile => 'alumni_profile',
      TargetType.comment => 'comment',
      TargetType.user => 'user',
    };

class Report {
  final String id;
  final String reporterId;
  final TargetType targetType;
  final String targetId;
  final String reason;
  final ReportStatus status;
  final String? resultNote;
  final DateTime createdAt;

  Report({
    required this.id,
    required this.reporterId,
    required this.targetType,
    required this.targetId,
    required this.reason,
    this.status = ReportStatus.open,
    this.resultNote,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Report copyWith({
    String? id,
    String? reporterId,
    TargetType? targetType,
    String? targetId,
    String? reason,
    ReportStatus? status,
    String? resultNote,
    DateTime? createdAt,
  }) {
    return Report(
      id: id ?? this.id,
      reporterId: reporterId ?? this.reporterId,
      targetType: targetType ?? this.targetType,
      targetId: targetId ?? this.targetId,
      reason: reason ?? this.reason,
      status: status ?? this.status,
      resultNote: resultNote ?? this.resultNote,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /admin/reports` row (§6.12).
  factory Report.fromJson(Map<String, dynamic> j) => Report(
        id: asId(j['id']),
        reporterId: asId(j['reporter_id']),
        targetType: targetTypeFromWire(j['target_type']),
        targetId: asId(j['target_id']),
        reason: asString(j['reason']),
        status: enumFromWire(ReportStatus.values, j['status'], fallback: ReportStatus.open),
        resultNote: asStringOrNull(j['result_note']),
        createdAt: asDate(j['created_at']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'reporter_id': reporterId,
        'target_type': targetTypeToWire(targetType),
        'target_id': targetId,
        'reason': reason,
        'status': enumToWire(status),
        'result_note': resultNote,
        'created_at': createdAt.toIso8601String(),
      };
}
