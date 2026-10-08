import '../remote/json_utils.dart';
import 'app_notification.dart';

/// A per-type notification mute toggle. `GET /me/notification-preferences`
/// returns one row per known [NotificationType]; the switch reads as "enabled"
/// (`!muted`) so the server's `muted` flag stays the single source of truth.
class NotificationPreferenceItem {
  final NotificationType type;
  final bool muted;

  const NotificationPreferenceItem({required this.type, required this.muted});

  factory NotificationPreferenceItem.fromJson(Map<String, dynamic> j) =>
      NotificationPreferenceItem(
        type: enumFromWire(NotificationType.values, j['type'],
            fallback: NotificationType.system),
        muted: asBool(j['muted']),
      );

  Map<String, dynamic> toJson() => {
        'type': enumToWire(type),
        'muted': muted,
      };
}
