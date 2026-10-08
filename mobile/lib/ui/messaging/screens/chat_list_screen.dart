import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/messaging_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// The messaging inbox (`GET /conversations`). Server-ordered by
/// `last_message_at`; swipe actions map to the server's real capabilities —
/// pin (§6.8 PATCH) and leave — since there is no archive/delete endpoint.
class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});
  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<MessagingNotifier>().loadInbox();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<MessagingNotifier>();
    final c = ThuieTheme.colorsOf(context);

    return ThuiePage(
      bar: ThuieBar(title: L10n.messages),
      body: switch (notifier.status) {
        AsyncStatus.idle || AsyncStatus.loading => const Center(child: ThuieLoader()),
        AsyncStatus.error => ResultState(
            icon: LucideIcons.wifiOff,
            title: L10n.errGeneric,
            message: notifier.error is ApiError
                ? L10n.describeApiError((notifier.error as ApiError).code)
                : null,
            actionLabel: L10n.retry,
            onAction: () => notifier.loadInbox(refresh: true),
          ),
        AsyncStatus.ready => notifier.conversations.isEmpty
            ? EmptyState(text: L10n.noMessagesYet, icon: LucideIcons.messageSquare)
            : ThuieRefreshIndicator(
                onRefresh: () => notifier.loadInbox(refresh: true),
                child: ListView.separated(
                  padding: const EdgeInsets.all(ThuieSpace.lg),
                  itemCount: notifier.conversations.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final conv = notifier.conversations[i];
                    final peer = conv.counterpart;
                    final lastMsg = conv.lastMessage;
                    return SwipeableTile(
                      key: ValueKey('chat_${conv.id}'),
                      rightActions: [
                        SwipeAction(
                          icon: conv.pinned ? LucideIcons.pinOff : LucideIcons.pin,
                          color: c.warn,
                          label: conv.pinned ? L10n.unpin : L10n.pin,
                          onTap: () => notifier.setFlags(conv.id, pinned: !conv.pinned),
                        ),
                        SwipeAction(
                          icon: LucideIcons.logOut,
                          color: c.danger,
                          label: L10n.leave,
                          onTap: () => notifier.leave(conv.id),
                        ),
                      ],
                      child: GestureDetector(
                        onTap: () =>
                            Navigator.of(context).pushNamed(Routes.chatDetail, arguments: conv.id),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: c.surface,
                            borderRadius: BorderRadius.circular(ThuieRadii.md),
                            border: Border.all(color: c.hairline, width: 0.5),
                          ),
                          child: Row(children: [
                            Avatar(
                              name: peer?.name ?? '?',
                              seed: peer?.id.hashCode ?? conv.id.hashCode,
                              size: 42,
                              imagePath: peer?.avatarUrl,
                            ),
                            const SizedBox(width: 12),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Expanded(
                                  child: Text(peer?.name ?? L10n.unknownUserLabel,
                                      style: const TextStyle(fontWeight: FontWeight.w500),
                                      overflow: TextOverflow.ellipsis),
                                ),
                                if (conv.pinned)
                                  Icon(LucideIcons.pin, size: 13, color: c.muted),
                              ]),
                              const SizedBox(height: 2),
                              Text(
                                lastMsg == null
                                    ? ''
                                    : (lastMsg.deleted ? L10n.messageDeleted : lastMsg.content ?? ''),
                                style: TextStyle(fontSize: 13, color: c.muted),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ])),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                if (lastMsg != null)
                                  Text(Fmt.relative(lastMsg.sentAt),
                                      style: TextStyle(fontSize: 11, color: c.muted)),
                                if (conv.unreadCount > 0) ...[
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: c.accent,
                                      borderRadius: BorderRadius.circular(ThuieRadii.lg),
                                    ),
                                    child: Text('${conv.unreadCount}',
                                        style: const TextStyle(
                                            color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ],
                            ),
                          ]),
                        ),
                      ),
                    );
                  },
                ),
              ),
      },
    );
  }
}
