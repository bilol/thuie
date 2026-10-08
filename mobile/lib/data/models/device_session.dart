import '../remote/json_utils.dart';

/// A logged-in device / auth session (maps to the backend `refresh_tokens`
/// table). Surfaced so users can see and revoke unfamiliar sign-ins.
class DeviceSession {
  final String id;
  final String userId;
  final String label;
  final String platform;
  final String location;
  final DateTime lastActiveAt;
  final DateTime createdAt;
  final bool current;

  DeviceSession({
    required this.id,
    required this.userId,
    required this.label,
    required this.platform,
    this.location = '',
    required this.lastActiveAt,
    DateTime? createdAt,
    this.current = false,
  }) : createdAt = createdAt ?? DateTime.now();

  DeviceSession copyWith({bool? current}) => DeviceSession(
        id: id,
        userId: userId,
        label: label,
        platform: platform,
        location: location,
        lastActiveAt: lastActiveAt,
        createdAt: createdAt,
        current: current ?? this.current,
      );

  /// `GET /me/sessions` row (§12.3). `userId` is implicit (the caller's own
  /// session list) and `platform` is not surfaced by the backend.
  factory DeviceSession.fromJson(Map<String, dynamic> j) => DeviceSession(
        id: asId(j['id']),
        userId: asId(j['user_id']),
        label: asString(j['device_label']),
        platform: asString(j['platform']),
        location: asString(j['ip']),
        lastActiveAt: asDate(j['last_used_at'] ?? j['created_at']),
        createdAt: asDate(j['created_at']),
        current: asBool(j['current']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'device_label': label,
        'ip': location,
        'created_at': createdAt.toIso8601String(),
        'last_used_at': lastActiveAt.toIso8601String(),
        'current': current,
      };
}
