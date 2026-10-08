import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/notifications_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class NotificationListScreen extends StatefulWidget {
  const NotificationListScreen({super.key});
  @override
  State<NotificationListScreen> createState() => _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<NotificationsNotifier>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<NotificationsNotifier>();
    final hasUnread = notifier.unreadCount > 0;

    Widget body;
    switch (notifier.status) {
      case AsyncStatus.idle:
      case AsyncStatus.loading:
        body = const Center(child: ThuieLoader());
      case AsyncStatus.error:
        body = ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        );
      case AsyncStatus.ready:
        body = notifier.items.isEmpty
            ? EmptyState(text: L10n.noNotificationsYet, icon: LucideIcons.bell)
            : PagedListView<AppNotification>(
                items: notifier.items,
                padding: const EdgeInsets.all(ThuieSpace.lg),
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                onLoadMore: notifier.hasMore ? notifier.loadMore : null,
                hasMore: notifier.hasMore,
                isLoadingMore: notifier.loadingMore,
                itemBuilder: (_, n) => _NotificationTile(
                  n: n,
                  onTap: n.read ? null : () => notifier.markRead(n.id),
                ),
              );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.notifications, actions: [
        if (hasUnread)
          ThuieIconButton(
            icon: LucideIcons.checkCheck, size: 20,
            onTap: () => notifier.markAllRead(),
          ),
      ]),
      body: RefreshIndicator(onRefresh: () => notifier.load(refresh: true), child: body),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification n;
  final VoidCallback? onTap;
  const _NotificationTile({required this.n, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final actor = n.actor;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          border: Border.all(color: c.hairline, width: 0.5),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Person-centric notifications (asks, replies, mentorship) lead with
          // the actor's avatar; system/broadcast rows keep the flush layout.
          if (actor != null) ...[
            Avatar(name: actor.name, seed: actor.id.hashCode, size: 40, imagePath: actor.avatarUrl),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(n.title, style: const TextStyle(fontWeight: FontWeight.w500))),
                if (!n.read)
                  Container(
                    width: 8, height: 8,
                    margin: const EdgeInsets.only(left: 6),
                    decoration: BoxDecoration(color: c.accent, shape: BoxShape.circle),
                  ),
              ]),
              const SizedBox(height: 4),
              Text(n.body, style: TextStyle(fontSize: 13, color: c.muted)),
              const SizedBox(height: 6),
              MetaText(Fmt.relative(n.createdAt)),
            ]),
          ),
        ]),
      ),
    );
  }
}
