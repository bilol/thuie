import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/event_visuals.dart';
import 'event_detail_screen.dart';

/// The viewer's own event seats (§6.10), backed by
/// `GET /me/event-registrations` — the mobile twin of the web `/events/registrations`
/// page. Splits upcoming vs past, shows a ticket chip for held seats, and taps
/// through to [EventDetailScreen]. Reached from the app-bar action on
/// [EventsScreen]. Distinct from [EventRegistrationsScreen], which lists *who else*
/// is attending a single event.
class MyRegistrationsScreen extends StatefulWidget {
  const MyRegistrationsScreen({super.key});

  @override
  State<MyRegistrationsScreen> createState() => _MyRegistrationsScreenState();
}

class _MyRegistrationsScreenState extends State<MyRegistrationsScreen> {
  List<MyEventRegistration> _regs = const [];
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
    final regs = await context.read<EventsNotifier>().fetchMyRegistrations();
    if (!mounted) return;
    setState(() {
      _regs = regs;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final withEvent = _regs.where((r) => r.event != null).toList();
    final upcoming = withEvent.where((r) => !r.event!.isEnded).toList();
    final past = withEvent.where((r) => r.event!.isEnded).toList();

    return ThuiePage(
      bar: ThuieBar(title: L10n.myRegistrationsTitle),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: ThuieLoader())
            : _failed
                ? ResultState(
                    icon: LucideIcons.wifiOff,
                    title: L10n.errGeneric,
                    actionLabel: L10n.retry,
                    onAction: _load,
                  )
                : withEvent.isEmpty
                    ? ListView(
                        padding: const EdgeInsets.all(ThuieSpace.lg),
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: EmptyState(
                              text: L10n.noRegistrationsMsg,
                              icon: LucideIcons.ticket,
                            ),
                          ),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.all(ThuieSpace.lg),
                        children: [
                          ..._section(c, L10n.myRegistrationsUpcoming, upcoming),
                          ..._section(c, L10n.myRegistrationsPast, past),
                        ],
                      ),
      ),
    );
  }

  List<Widget> _section(ThuieColors c, String title, List<MyEventRegistration> regs) {
    if (regs.isEmpty) return const [];
    return [
      Padding(
        padding: const EdgeInsets.only(bottom: 10, left: 4),
        child: Text(title,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.muted)),
      ),
      for (final r in regs)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _RegistrationTile(reg: r),
        ),
    ];
  }
}

class _RegistrationTile extends StatelessWidget {
  final MyEventRegistration reg;
  const _RegistrationTile({required this.reg});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final e = reg.event!;
    final showTicket = reg.hasTicket && !reg.attended;
    return GestureDetector(
      onTap: () => Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => EventDetailScreen(e))),
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(ThuieRadii.lg),
          border: Border.all(color: c.hairline, width: 0.5),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            height: 72,
            width: double.infinity,
            child: e.imageUrl != null
                ? Image.network(e.imageUrl!, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _gradient(e))
                : _gradient(e),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Text(e.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 8),
                Seal(
                  text: reg.attended ? L10n.attendedLabel : L10n.registeredLabel,
                  tone: reg.attended ? SealTone.ok : SealTone.neutral,
                ),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                Icon(LucideIcons.calendar, size: 14, color: c.muted),
                const SizedBox(width: 6),
                Text('${L10n.monthDay(e.date.month, e.date.day)} ${e.date.hour}:${e.date.minute.toString().padLeft(2, '0')}',
                    style: TextStyle(fontSize: 13, color: c.ink2)),
                const SizedBox(width: 14),
                Icon(LucideIcons.mapPin, size: 14, color: c.muted),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(e.location,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: c.ink2))),
              ]),
              if (showTicket) ...[
                const SizedBox(height: 10),
                Row(children: [
                  Icon(LucideIcons.ticket, size: 14, color: c.accent),
                  const SizedBox(width: 6),
                  Text(L10n.ticketChipLabel,
                      style: TextStyle(fontSize: 12, color: c.accent, fontWeight: FontWeight.w600)),
                ]),
              ],
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _gradient(CampusEvent e) => DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: eventGradient(e.type),
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const SizedBox.expand(),
      );
}
