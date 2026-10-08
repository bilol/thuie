import '../remote/json_utils.dart';

class OperationLog {
  final String id;
  final String adminId;
  final String adminName;
  final String action;
  final String targetType;
  final String targetId;
  final Map<String, dynamic> detail;
  final DateTime createdAt;

  OperationLog({
    required this.id,
    required this.adminId,
    required this.adminName,
    required this.action,
    this.targetType = '',
    this.targetId = '',
    this.detail = const {},
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  /// `GET /admin/operation-logs` row (§6.12). `adminName` comes from the
  /// nested `admin`; `detail` stays a structured map so the UI can render it
  /// human-readably instead of dumping raw JSON.
  factory OperationLog.fromJson(Map<String, dynamic> j) {
    final admin = (j['admin'] as Map?)?.cast<String, dynamic>();
    final detail = j['detail'];
    return OperationLog(
      id: asId(j['id']),
      adminId: asId(admin?['id'] ?? j['admin_id']),
      adminName: asString(admin?['name']),
      action: asString(j['action']),
      targetType: asString(j['target_type']),
      targetId: asString(j['target_id']),
      detail: detail is Map ? detail.cast<String, dynamic>() : const {},
      createdAt: asDate(j['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'admin_id': adminId,
        'action': action,
        'target_type': targetType,
        'target_id': targetId,
        'detail': detail,
        'created_at': createdAt.toIso8601String(),
      };
}
