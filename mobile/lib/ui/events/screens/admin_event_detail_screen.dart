import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/event_visuals.dart';
import 'event_form_sheet.dart';

/// Admin/organizer event detail (§6.10): the full event record *and* its
/// registration roster — who signed up and who has checked in — backed by
/// `GET /events/:id/registrations`. Reuses the on-site [Routes.eventCheckIn]
/// sheet and the shared cancel action; the roster reloads when check-in closes.
class AdminEventDetailScreen extends StatefulWidget {
  final CampusEvent event;
  const AdminEventDetailScreen(this.event, {super.key});

  @override
  State<AdminEventDetailScreen> createState() => _AdminEventDetailScreenState();
}

class _AdminEventDetailScreenState extends State<AdminEventDetailScreen> {
  EventRegistrations? _regs;
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
    final r = await context
        .read<EventsNotifier>()
        .fetchRegistrations(widget.event.id);
    if (!mounted) return;
    setState(() {
      _regs = r;
      _loading = false;
      _failed = r == null;
    });
  }

  Future<void> _openCheckIn() async {
    await Navigator.of(context)
        .pushNamed(Routes.eventCheckIn, arguments: widget.event.id);
    if (mounted) _load(); // reflect freshly checked-in attendees
  }

  void _cancelEvent() {
    final messenger = ScaffoldMessenger.of(context);
    final events = context.read<EventsNotifier>();
    showThuieConfirm(
      context,
      title: L10n.cancelActivityAction,
      body: L10n.cancelActivityConfirm,
      destructive: true,
      onConfirm: () async {
        final ok = await events.cancelEvent(widget.event.id);
        if (!mounted) return;
        if (ok) {
          Navigator.of(context).pop();
        } else {
          messenger.showSnackBar(
              SnackBar(content: Text(L10n.actionError(events.error?.code))));
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    // Prefer the live shared row so cancel / head-count changes reflect here.
    final event = context.watch<EventsNotifier>().byId(widget.event.id) ?? widget.event;

    return ThuiePage(
      bar: ThuieBar(title: L10n.eventDetail),
      body: ListView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        children: [
          _Header(event: event),
          const SizedBox(height: 16),
          _MetaCard(event: event),
          const SizedBox(height: 20),
          SectionLabel(L10n.registeredUsers),
          const SizedBox(height: 8),
          _Roster(
            loading: _loading,
            failed: _failed,
            regs: _regs,
            onRetry: _load,
          ),
          const SizedBox(height: 24),
          if (!event.cancelled)
            Align(
              alignment: Alignment.centerRight,
              child: MoreActionsButton(actions: [
                MoreAction(
                  icon: LucideIcons.pencil,
                  label: L10n.edit,
                  onTap: () => showEventFormSheet(context, event: event),
                ),
                MoreAction(
                  icon: LucideIcons.scanLine,
                  label: L10n.checkInTitle,
                  onTap: _openCheckIn,
                ),
                MoreAction(
                  icon: LucideIcons.trash2,
                  label: L10n.cancelActivityAction,
                  danger: true,
                  onTap: _cancelEvent,
                ),
              ]),
            )
          else
            Text(L10n.activityCancelledBadge,
                style: TextStyle(fontSize: 13, color: c.danger)),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final CampusEvent event;
  const _Header({required this.event});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(ThuieRadii.lg),
        gradient: LinearGradient(
          colors: eventGradient(event.type),
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(eventTypeLabel(event.type),
            style: const TextStyle(
                color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),
        Text(event.title,
            style: const TextStyle(
                color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
        if (event.description.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(event.description,
              style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.5)),
        ],
      ]),
    );
  }
}

class _MetaCard extends StatelessWidget {
  final CampusEvent event;
  const _MetaCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(ThuieSpace.lg),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(ThuieRadii.md),
        border: Border.all(color: c.hairline, width: 0.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _row(c, LucideIcons.calendar,
            '${L10n.fullDate(event.date.year, event.date.month, event.date.day)} ${Fmt.time(event.date)}'),
        const SizedBox(height: 10),
        _row(c, LucideIcons.mapPin, event.location),
        const SizedBox(height: 10),
        _row(c, LucideIcons.users,
            '${event.registeredCount}/${event.capacity} ${L10n.registeredCountLabel}'),
        const SizedBox(height: 10),
        _row(c, LucideIcons.building2, '${L10n.organizerPrefix}${event.organizer}'),
      ]),
    );
  }

  Widget _row(ThuieColors c, IconData icon, String text) => Row(children: [
        Icon(icon, size: 16, color: c.accent),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
      ]);
}

class _Roster extends StatelessWidget {
  final bool loading;
  final bool failed;
  final EventRegistrations? regs;
  final VoidCallback onRetry;
  const _Roster({
    required this.loading,
    required this.failed,
    required this.regs,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: ThuieLoader()),
      );
    }
    if (failed) {
      return ResultState(
        icon: LucideIcons.wifiOff,
        title: L10n.errGeneric,
        actionLabel: L10n.retry,
        onAction: onRetry,
      );
    }
    final data = regs?.data ?? const [];
    if (data.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: EmptyState(text: L10n.noRegistrants, icon: LucideIcons.users),
      );
    }
    final attended = regs?.attended ?? 0;
    final total = regs?.total ?? data.length;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(ThuieSpace.lg),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(ThuieRadii.md),
        border: Border.all(color: c.hairline, width: 0.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(L10n.attendeeSummary(attended, total),
            style: TextStyle(fontSize: 12, color: c.muted)),
        const SizedBox(height: 12),
        for (final r in data) ...[
          _RegistrantTile(registrant: r),
          if (r != data.last)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Divider(height: 1, thickness: 0.5, color: c.hairline),
            ),
        ],
      ]),
    );
  }
}

class _RegistrantTile extends StatelessWidget {
  final EventRegistrant registrant;
  const _RegistrantTile({required this.registrant});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Row(children: [
      Avatar(
        name: registrant.name,
        seed: registrant.userId.hashCode,
        size: 40,
        imagePath: registrant.avatarUrl,
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(registrant.name.isEmpty ? L10n.unknownUserLabel : registrant.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          if ((registrant.studentId ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(registrant.studentId!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: c.muted)),
            ),
        ]),
      ),
      const SizedBox(width: 8),
      if (registrant.attended)
        Seal(text: L10n.checkedInSeal, tone: SealTone.ok, filled: true)
      else
        Seal(text: L10n.awaitingCheckInSeal, tone: SealTone.warn),
    ]);
  }
}
