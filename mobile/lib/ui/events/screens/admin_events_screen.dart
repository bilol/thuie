import '../../../l10n.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../theme/thuie_theme.dart';
import '../../components/common.dart';
import 'admin_event_detail_screen.dart';
import 'event_form_sheet.dart';
import 'events_screens.dart';

/// Admin event management over `GET/POST/PATCH /events` (§6.10): list every
/// event, create one, cancel one, and open the on-site ticket check-in sheet.
class AdminEventsScreen extends StatefulWidget {
  const AdminEventsScreen({super.key});

  @override
  State<AdminEventsScreen> createState() => _AdminEventsScreenState();
}

class _AdminEventsScreenState extends State<AdminEventsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    await context.read<EventsNotifier>().load(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final events = context.watch<EventsNotifier>();
    final sorted = [...events.items]..sort((a, b) => a.date.compareTo(b.date));

    return ThuiePage(
      bar: ThuieBar(title: L10n.eventManagement),
      floatingAction: FloatingActionButton(
        onPressed: () => showEventFormSheet(context),
        child: const Icon(LucideIcons.plus),
      ),
      body: switch (events.status) {
        AsyncStatus.loading when sorted.isEmpty => const Center(child: ThuieLoader()),
        AsyncStatus.error => Center(
            child: ResultState(
              icon: LucideIcons.wifiOff,
              title: L10n.errGeneric,
              message: L10n.describeApiError(events.error?.code ?? ''),
              actionLabel: L10n.retry,
              onAction: _load,
            ),
          ),
        _ => sorted.isEmpty
            ? EmptyState(text: L10n.noRegisteredEvents, icon: LucideIcons.calendar)
            : ListView.separated(
                padding: const EdgeInsets.all(ThuieSpace.lg),
                itemCount: sorted.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final e = sorted[i];
                  return GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => AdminEventDetailScreen(e)),
                    ),
                    child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(ThuieRadii.md),
                      border: Border.all(color: c.hairline, width: 0.5),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(
                            child: Text(e.title,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
                        if (e.cancelled)
                          Seal(text: L10n.activityCancelledBadge, tone: SealTone.danger)
                        else
                          Seal(text: eventTypeLabel(e.type), tone: SealTone.accent),
                      ]),
                      const SizedBox(height: 4),
                      MetaText('${Fmt.time(e.date)} · ${e.location}'),
                      MetaText('${e.registeredCount}/${e.capacity}'),
                      if (!e.cancelled) ...[
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: MoreActionsButton(actions: [
                            MoreAction(
                              icon: LucideIcons.pencil,
                              label: L10n.edit,
                              onTap: () => showEventFormSheet(context, event: e),
                            ),
                            MoreAction(
                              icon: LucideIcons.scanLine,
                              label: L10n.checkInTitle,
                              onTap: () => Navigator.of(context).pushNamed(Routes.eventCheckIn, arguments: e.id),
                            ),
                            MoreAction(
                              icon: LucideIcons.trash2,
                              label: L10n.cancelActivityAction,
                              danger: true,
                              onTap: () => showThuieConfirm(context,
                                  title: L10n.cancelActivityAction,
                                  body: L10n.cancelActivityConfirm,
                                  destructive: true,
                                  onConfirm: () => context.read<EventsNotifier>().cancelEvent(e.id)),
                            ),
                          ]),
                        ),
                      ],
                    ]),
                  ),
                  );
                },
              ),
      },
    );
  }
}

/// Organizer-side on-site check-in: an attendee shows their live ticket
/// (`GET /events/:id/ticket`) and the organizer pastes/scans the token →
/// `POST /events/:id/check-in`. The server validates + marks the seat attended.
class EventCheckInScreen extends StatefulWidget {
  final String eventId;
  const EventCheckInScreen(this.eventId, {super.key});

  @override
  State<EventCheckInScreen> createState() => _EventCheckInScreenState();
}

class _EventCheckInScreenState extends State<EventCheckInScreen> {
  String _ticket = '';
  String? _message;
  bool _messageIsError = false;
  bool _busy = false;

  Future<void> _submit() async {
    final raw = _ticket.trim();
    if (raw.isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    final events = context.read<EventsNotifier>();
    final ok = await events.checkIn(widget.eventId, raw);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _messageIsError = !ok;
      _message = ok ? L10n.checkInSuccess : L10n.actionError(events.error?.code);
      if (ok) _ticket = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final ev = context.select<EventsNotifier, CampusEvent?>((e) => e.byId(widget.eventId));

    return ThuiePage(
      bar: ThuieBar(title: '${L10n.checkInTitle}${ev == null ? '' : ' · ${ev.title}'}'),
      body: ListView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        children: [
          Text(L10n.checkInDesc, style: TextStyle(fontSize: 13, color: c.muted, height: 1.4)),
          if (ev != null) ...[
            const SizedBox(height: 14),
            Text('${ev.registeredCount}/${ev.capacity}',
                style: TextStyle(fontWeight: FontWeight.w600, color: c.accent)),
          ],
          const SizedBox(height: 12),
          FlatField(
            value: _ticket,
            onChanged: (v) { _ticket = v; if (_message != null) setState(() => _message = null); },
            label: L10n.checkInCodeLabel,
            placeholder: L10n.ticketCodeHint,
            leadingIcon: const Icon(LucideIcons.scanLine, size: 18),
          ),
          const SizedBox(height: 10),
          ThuieFilledButton(label: L10n.checkInButton, onTap: _busy ? null : _submit),
          if (_message != null) ...[
            const SizedBox(height: 10),
            Text(_message!, style: TextStyle(color: _messageIsError ? c.danger : c.ok, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}
