import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/event_visuals.dart';
import 'event_registrations_screen.dart';

class EventDetailScreen extends StatefulWidget {
  final CampusEvent event;
  const EventDetailScreen(this.event, {super.key});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  /// The detail row (`GET /events/:id`) carries the long description the list
  /// feed omits; the list row keeps the head-count. We merge the two below.
  CampusEvent? _detail;
  EventRegistrations? _attendees;
  String? _ticket;
  bool _ticketRequested = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final notifier = context.read<EventsNotifier>();
      notifier.load();
      notifier.loadMine();
      notifier.fetchOne(widget.event.id).then((d) {
        if (mounted && d != null) setState(() => _detail = d);
      });
      // Public "who's going" roster powers the tappable avatar stack below.
      notifier.fetchAttendees(widget.event.id).then((a) {
        if (mounted && a != null) setState(() => _attendees = a);
      });
    });
  }

  void _maybeLoadTicket(bool registered) {
    if (!registered || _ticket != null || _ticketRequested) return;
    _ticketRequested = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final t = await context.read<EventsNotifier>().ticket(widget.event.id);
      if (!mounted) return;
      setState(() => _ticket = t);
    });
  }

  Future<void> _toggleRegistration(
      EventsNotifier notifier, bool registered) async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = registered
        ? await notifier.cancel(widget.event.id)
        : await notifier.register(widget.event.id);
    if (!ok) {
      messenger.showSnackBar(
        SnackBar(content: Text(L10n.actionError(notifier.error?.code)), duration: const Duration(seconds: 2)),
      );
      return;
    }
    if (registered) setState(() => _ticket = null);
    messenger.showSnackBar(
      SnackBar(
        content: Text(registered ? L10n.cancelledRegMsg : L10n.registeredMsg),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final notifier = context.watch<EventsNotifier>();
    final user = context.watch<AuthSession>().user;

    // Merge: head-count from the (live) list row, description from the detail.
    final headCount =
        (notifier.byId(widget.event.id) ?? widget.event).registeredCount;
    final description = _detail?.description.isNotEmpty == true
        ? _detail!.description
        : widget.event.description;
    final live =
        widget.event.copyWith(registeredCount: headCount, description: description);

    final isPast = live.isEnded;
    final registered = user != null && notifier.isRegistered(live.id);
    final checkedIn = notifier.isCheckedIn(live.id);
    _maybeLoadTicket(registered);

    return ThuiePage(
      bar: ThuieBar(title: live.title),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(ThuieRadii.lg),
              gradient: LinearGradient(colors: eventGradient(live.type), begin: Alignment.topLeft, end: Alignment.bottomRight),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(ThuieRadii.lg)),
                child: Text(eventTypeLabel(live.type), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 10),
              Text(live.title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(live.description, style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.5)),
            ]),
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(ThuieSpace.lg),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(LucideIcons.calendar, size: 16, color: c.accent),
                const SizedBox(width: 8),
                Expanded(child: Text('${L10n.fullDate(live.date.year, live.date.month, live.date.day)} ${live.date.hour}:${live.date.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 14))),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Icon(LucideIcons.mapPin, size: 16, color: c.accent),
                const SizedBox(width: 8),
                Expanded(child: Text(live.location, style: const TextStyle(fontSize: 14))),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Icon(LucideIcons.users, size: 16, color: c.accent),
                const SizedBox(width: 8),
                Expanded(child: Text('${live.registeredCount}/${live.capacity} ${L10n.registeredCountLabel}', style: const TextStyle(fontSize: 14))),
              ]),
              if ((_attendees?.data ?? const []).isNotEmpty) ...[
                const SizedBox(height: 10),
                InkWell(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => EventRegistrationsScreen(live))),
                  borderRadius: BorderRadius.circular(ThuieRadii.sm),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
                    child: Row(children: [
                      _AttendeeStack(attendees: _attendees!.data),
                      const SizedBox(width: 10),
                      Expanded(child: Text(L10n.whoRegistered, style: TextStyle(fontSize: 12, color: c.accent))),
                      Icon(LucideIcons.chevronRight, size: 16, color: c.muted),
                    ]),
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Row(children: [
                Icon(LucideIcons.building2, size: 16, color: c.accent),
                const SizedBox(width: 8),
                Expanded(child: Text('${L10n.organizerPrefix}${live.organizer}', style: const TextStyle(fontSize: 14))),
              ]),
            ]),
          ),
          if (registered) ...[
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(ThuieSpace.lg),
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.circular(ThuieRadii.md),
                border: Border.all(color: c.accent, width: 1),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Icon(LucideIcons.ticket, size: 16, color: c.accent),
                  const SizedBox(width: 8),
                  Expanded(child: Text(L10n.myTicket, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
                  if (checkedIn)
                    Seal(text: L10n.checkedInSeal, tone: SealTone.ok, filled: true)
                  else
                    Seal(text: L10n.awaitingCheckInSeal, tone: SealTone.warn),
                ]),
                const SizedBox(height: 8),
                Text(L10n.ticketHint, style: TextStyle(fontSize: 12, color: c.muted, height: 1.4)),
                const SizedBox(height: 12),
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(ThuieRadii.md),
                    ),
                    child: _ticket == null
                        ? const SizedBox(
                            width: 160, height: 160, child: Center(child: ThuieLoader(size: 24)))
                        : QrImageView(
                            data: _ticket!,
                            version: QrVersions.auto,
                            size: 160.0,
                            backgroundColor: Colors.white,
                          ),
                  ),
                ),
              ]),
            ),
          ],
          if (!isPast && user != null) ...[
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ThuieFilledButton(
                label: registered ? L10n.cancelRegLabel : L10n.registerNowLabel,
                onTap: () => _toggleRegistration(notifier, registered),
              ),
            ),
          ],
        ]),
      ),
    );
  }
}

/// Overlapping avatar stack for the event's registrants (first [maxVisible] +
/// a `+N` overflow chip). Tapping the row opens [EventRegistrationsScreen].
class _AttendeeStack extends StatelessWidget {
  final List<EventRegistrant> attendees;
  const _AttendeeStack({required this.attendees});

  static const _maxVisible = 5;
  static const _size = 28.0;
  static const _step = 20.0; // 8px overlap

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final visible = attendees.take(_maxVisible).toList();
    final extra = (attendees.length - visible.length).clamp(0, 9999);
    final width = visible.length * _step + (extra > 0 ? _step : 0);
    return SizedBox(
      height: _size + 4,
      width: width,
      child: Stack(
        children: [
          for (var i = 0; i < visible.length; i++)
            Positioned(
              left: i * _step,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: c.surface, width: 2),
                ),
                child: Avatar(
                  name: visible[i].name,
                  seed: visible[i].userId.hashCode,
                  size: _size,
                  imagePath: visible[i].avatarUrl,
                ),
              ),
            ),
          if (extra > 0)
            Positioned(
              left: visible.length * _step,
              child: Container(
                width: _size, height: _size,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.accentWeak,
                  shape: BoxShape.circle,
                  border: Border.all(color: c.surface, width: 2),
                ),
                child: Text('+${extra > 99 ? '99' : extra}',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: c.accent)),
              ),
            ),
        ],
      ),
    );
  }
}
