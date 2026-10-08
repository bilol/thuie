import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/notifiers/alumni_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Lists a profile owner's accepted first-degree connections
/// (`GET /alumni/:id/connections`). Reached by tapping the connection count on
/// the alumni detail header. Read-only: the wire rows carry a peer `user_id`,
/// not a profile id, so there's no reliable tap-through to their profile.
class AlumniConnectionsScreen extends StatefulWidget {
  final String profileId;
  const AlumniConnectionsScreen(this.profileId, {super.key});
  @override
  State<AlumniConnectionsScreen> createState() => _AlumniConnectionsScreenState();
}

class _AlumniConnectionsScreenState extends State<AlumniConnectionsScreen> {
  late final Future<List<AlumniConnection>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AlumniNotifier>().connectionsFor(widget.profileId);
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.connectionsTitle),
      body: FutureBuilder<List<AlumniConnection>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: ThuieLoader());
          }
          final conns = snap.data ?? const <AlumniConnection>[];
          if (conns.isEmpty) {
            return EmptyState(text: L10n.noConnectionsMsg, icon: LucideIcons.users);
          }
          return ListView.separated(
            padding: const EdgeInsets.all(ThuieSpace.lg),
            itemCount: conns.length,
            separatorBuilder: (_, __) => const SizedBox(height: 6),
            itemBuilder: (_, i) {
              final peer = conns[i];
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(ThuieRadii.sm),
                  border: Border.all(color: c.hairline, width: 0.5),
                ),
                child: Row(children: [
                  Avatar(name: peer.name, seed: peer.id.hashCode, size: 40, imagePath: peer.avatarUrl),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      peer.name.isEmpty ? L10n.unknownUserLabel : peer.name,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  RoleBadge(peer.role),
                ]),
              );
            },
          );
        },
      ),
    );
  }
}
