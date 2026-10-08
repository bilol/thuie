import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/notification_prefs_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../widgets/privacy_tile.dart';

/// Notification category toggles backed by `GET`/`PATCH /me/notification-preferences`.
/// The server returns one row per notification type it fans out; each switch is
/// the inverse of that type's `muted` flag and writes straight through, so the
/// choice persists across devices and reinstalls.
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});
  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationPrefsNotifier>().load();
    });
  }

  static String _label(NotificationType type) => switch (type) {
        NotificationType.reviewResult => L10n.notifReviewResult,
        NotificationType.commentReply => L10n.notifCommentReply,
        NotificationType.connection => L10n.notifConnection,
        NotificationType.system => L10n.notifSystem,
        NotificationType.reportResult => L10n.notifReportResult,
        NotificationType.identityChange => L10n.notifIdentityChange,
        NotificationType.broadcast => L10n.notifBroadcast,
      };

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<NotificationPrefsNotifier>();
    Widget body;
    if (notifier.status == AsyncStatus.loading && notifier.items.isEmpty) {
      body = const Center(child: ThuieLoader());
    } else if (notifier.status == AsyncStatus.error && notifier.items.isEmpty) {
      body = EmptyState(
        text: L10n.errGeneric,
        actionLabel: L10n.retry,
        onAction: () => notifier.load(refresh: true),
      );
    } else {
      body = RefreshIndicator(
        onRefresh: () => notifier.load(refresh: true),
        child: ListView(children: [
          for (final item in notifier.items)
            PrivacyTile(
              label: _label(item.type),
              desc: L10n.notifEnabledDesc,
              value: !item.muted,
              onChanged: (v) => notifier.setEnabled(item.type, v),
            ),
          const SizedBox(height: 20),
        ]),
      );
    }
    return ThuiePage(
      bar: ThuieBar(title: L10n.notificationSettings),
      body: body,
    );
  }
}
