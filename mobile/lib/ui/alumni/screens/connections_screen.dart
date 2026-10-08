import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/messaging_notifier.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/connections_notifier.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// A pending connection paired with the direction the box it came from implies
/// (the wire list rows omit `from_user_id`/`to_user_id`).
typedef _PendingEntry = ({Connection conn, bool incoming});

class ConnectionsScreen extends StatefulWidget {
  const ConnectionsScreen({super.key});
  @override
  State<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends State<ConnectionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<ConnectionsNotifier>().loadAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<ConnectionsNotifier>();
    final user = context.watch<AuthSession>().user;
    if (user == null) return const SizedBox.shrink();

    // The main screen is now the accepted network only; pending requests moved
    // to their own screen (opened from the app-bar action). loadAll() still
    // pulls both boxes so the request badge count is accurate here.
    final pendingCount = notifier.incoming.length + notifier.outgoingPending.length;
    final accepted = notifier.accepted;
    final loading = notifier.isLoading(ConnectionBox.accepted) && accepted.isEmpty;

    return ThuiePage(
      bar: ThuieBar(title: L10n.myConnectionsTitle, actions: [
        _RequestsAction(
          count: pendingCount,
          onTap: () => Navigator.of(context).pushNamed(Routes.connectionRequests),
        ),
      ]),
      body: loading
          ? const Center(child: ThuieLoader())
          : _AcceptedConnectionsList(connections: accepted),
    );
  }
}

/// App-bar entry point to the connection-requests screen, with a warn-toned
/// badge over the count of outstanding asks (incoming + outgoing). The badge
/// hides when nothing is pending.
class _RequestsAction extends StatelessWidget {
  final int count;
  final VoidCallback onTap;
  const _RequestsAction({required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(LucideIcons.userPlus, size: 22, color: c.accent),
            if (count > 0)
              Positioned(
                right: -7,
                top: -7,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(color: c.warn, borderRadius: BorderRadius.circular(ThuieRadii.lg)),
                  child: Text('$count', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Standalone screen for outstanding connection requests: incoming asks (accept /
/// ignore) and the user's own outgoing asks (withdraw). Opened from
/// [ConnectionsScreen]'s app-bar action.
class ConnectionRequestsScreen extends StatefulWidget {
  const ConnectionRequestsScreen({super.key});
  @override
  State<ConnectionRequestsScreen> createState() => _ConnectionRequestsScreenState();
}

class _ConnectionRequestsScreenState extends State<ConnectionRequestsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<ConnectionsNotifier>().loadAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<ConnectionsNotifier>();
    final user = context.watch<AuthSession>().user;
    if (user == null) return const SizedBox.shrink();
    final entries = <_PendingEntry>[
      for (final conn in notifier.incoming) (conn: conn, incoming: true),
      for (final conn in notifier.outgoingPending) (conn: conn, incoming: false),
    ];
    final loading = notifier.isLoading(ConnectionBox.requests) ||
        notifier.isLoading(ConnectionBox.mine);
    return ThuiePage(
      bar: ThuieBar(title: L10n.connectionRequests),
      body: loading && entries.isEmpty
          ? const Center(child: ThuieLoader())
          : _PendingConnectionsList(entries: entries),
    );
  }
}

class _PendingConnectionsList extends StatelessWidget {
  final List<_PendingEntry> entries;
  const _PendingConnectionsList({required this.entries});

  @override
  Widget build(BuildContext context) {
    final notifier = context.read<ConnectionsNotifier>();
    final c = ThuieTheme.colorsOf(context);

    final all = [...entries]..sort((a, b) => b.conn.createdAt.compareTo(a.conn.createdAt));
    if (all.isEmpty) {
      return EmptyState(text: L10n.noPendingMsg, icon: LucideIcons.userPlus);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ThuieSpace.lg),
      itemCount: all.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final entry = all[i];
        final conn = entry.conn;
        final isIncoming = entry.incoming;
        final peer = conn.peer;
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              if (peer != null) Avatar(name: peer.name, seed: peer.id.hashCode, size: 40, imagePath: peer.avatarUrl),
              const SizedBox(width: 10),
              Expanded(child: Text(peer?.name ?? L10n.unknownUserLabel, style: const TextStyle(fontWeight: FontWeight.w600))),
              if (!isIncoming) Seal(text: L10n.pendingConfirmLabel, tone: SealTone.warn),
            ]),
            if (conn.message.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: c.accentWeak,
                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                ),
                child: Text(conn.message, style: TextStyle(fontSize: 13, color: c.ink2)),
              ),
            ],
            const SizedBox(height: 12),
            if (isIncoming)
              Row(children: [
                Expanded(child: ThuieOutlinedButton(label: L10n.ignoreLabel, onTap: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  final ok = await notifier.respond(conn, ConnectionStatus.declined);
                  if (!ok) {
                    messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(notifier.error?.code))));
                    return;
                  }
                  messenger.showSnackBar(SnackBar(content: Text(L10n.connectionIgnoredMsg)));
                })),
                const SizedBox(width: 10),
                Expanded(child: ThuieFilledButton(label: L10n.acceptLabel, onTap: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  final ok = await notifier.respond(conn, ConnectionStatus.accepted);
                  if (!ok) {
                    messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(notifier.error?.code))));
                    return;
                  }
                  messenger.showSnackBar(SnackBar(content: Text(L10n.connectionAcceptedMsg)));
                })),
              ])
            else
              // The requester may withdraw their own still-pending ask
              // (`PATCH /connections/:id` → revoked).
              SizedBox(
                width: double.infinity,
                child: ThuieOutlinedButton(label: L10n.cancelRequestLabel, onTap: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  final ok = await notifier.respond(conn, ConnectionStatus.revoked);
                  if (!ok) {
                    messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(notifier.error?.code))));
                    return;
                  }
                  messenger.showSnackBar(SnackBar(content: Text(L10n.requestWithdrawnMsg)));
                }),
              ),
          ]),
        );
      },
    );
  }
}

class _AcceptedConnectionsList extends StatelessWidget {
  final List<Connection> connections;
  const _AcceptedConnectionsList({required this.connections});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);

    if (connections.isEmpty) {
      return EmptyState(text: L10n.noConnectionsMsg, icon: LucideIcons.users);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ThuieSpace.lg),
      itemCount: connections.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) {
        final conn = connections[i];
        final peer = conn.peer;
        return GestureDetector(
          onTap: () async {
            if (peer == null) return;
            final navigator = Navigator.of(context);
            final messenger = ScaffoldMessenger.of(context);
            final messaging = context.read<MessagingNotifier>();
            final convId = await messaging.conversationWith(peer.id);
            if (convId == null) {
              messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(messaging.error?.code))));
              return;
            }
            navigator.pushNamed(Routes.chatDetail, arguments: convId);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.sm),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Row(children: [
              if (peer != null) Avatar(name: peer.name, seed: peer.id.hashCode, size: 40, imagePath: peer.avatarUrl),
              const SizedBox(width: 12),
              Expanded(child: Text(peer?.name ?? L10n.unknownUserLabel, style: const TextStyle(fontWeight: FontWeight.w500))),
              Icon(LucideIcons.messageCircle, size: 18, color: c.muted),
            ]),
          ),
        );
      },
    );
  }
}
