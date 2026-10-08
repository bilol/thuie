import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Public "who's going" roster (§6.10), backed by `GET /events/:id/attendees` —
/// available to any logged-in viewer. Identity only (avatar + name); the
/// check-in state / student id live in the manager-only [AdminEventDetailScreen].
/// Reached by tapping the attendee stack on [EventDetailScreen].
class EventRegistrationsScreen extends StatefulWidget {
  final CampusEvent event;
  const EventRegistrationsScreen(this.event, {super.key});

  @override
  State<EventRegistrationsScreen> createState() => _EventRegistrationsScreenState();
}

class _EventRegistrationsScreenState extends State<EventRegistrationsScreen> {
  EventRegistrations? _attendees;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _failed = false;
    });
    final a = await context
        .read<EventsNotifier>()
        .fetchAttendees(widget.event.id);
    if (!mounted) return;
    setState(() {
      _attendees = a;
      _loading = false;
      _failed = a == null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final data = _attendees?.data ?? const <EventRegistrant>[];

    return ThuiePage(
      bar: ThuieBar(title: L10n.registeredUsers),
      body: _loading
          ? const Center(child: ThuieLoader())
          : _failed
              ? ResultState(
                  icon: LucideIcons.wifiOff,
                  title: L10n.errGeneric,
                  actionLabel: L10n.retry,
                  onAction: _load,
                )
              : ListView(
                  padding: const EdgeInsets.all(ThuieSpace.lg),
                  children: [
                    if (data.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 48),
                        child: EmptyState(
                            text: L10n.noRegistrants, icon: LucideIcons.users),
                      )
                    else ...[
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12, left: 4),
                        child: Text(
                          L10n.totalRegistrants(_attendees?.total ?? data.length),
                          style: TextStyle(fontSize: 13, color: c.muted),
                        ),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          color: c.surface,
                          borderRadius: BorderRadius.circular(ThuieRadii.md),
                          border: Border.all(color: c.hairline, width: 0.5),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: Column(
                          children: [
                            for (var i = 0; i < data.length; i++) ...[
                              _AttendeeTile(attendee: data[i]),
                              if (i != data.length - 1)
                                Divider(height: 1, thickness: 0.5, color: c.hairline),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
    );
  }
}

class _AttendeeTile extends StatelessWidget {
  final EventRegistrant attendee;
  const _AttendeeTile({required this.attendee});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(children: [
        Avatar(
          name: attendee.name,
          seed: attendee.userId.hashCode,
          size: 40,
          imagePath: attendee.avatarUrl,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            attendee.name.isEmpty ? L10n.unknownUserLabel : attendee.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ),
      ]),
    );
  }
}
