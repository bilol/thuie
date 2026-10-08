import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/event_visuals.dart';
import 'event_detail_screen.dart';
import 'my_registrations_screen.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});
  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  int _selectedFilter = 0;

  // Filter chips omit `sharing` (kept in the enum/visuals so such events still
  // render) to match the trimmed frontend filter bar.
  static const _filterTypes = <EventType?>[
    null,
    EventType.recruitment,
    EventType.lecture,
    EventType.ceremony,
    EventType.sports,
  ];

  List<String> get _filters => [L10n.allLabel, L10n.recruitmentLabel, L10n.lecture, L10n.celebration, L10n.sports];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final n = context.read<EventsNotifier>();
      n.load();
      n.loadMine();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final notifier = context.watch<EventsNotifier>();

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
        final filtered = notifier.items;
        body = filtered.isEmpty
            ? EmptyState(text: L10n.noEventsYet)
            : PagedListView<CampusEvent>(
                items: filtered,
                padding: const EdgeInsets.all(ThuieSpace.lg),
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                onLoadMore: notifier.hasMore ? notifier.loadMore : null,
                hasMore: notifier.hasMore,
                isLoadingMore: notifier.loadingMore,
                itemBuilder: (_, event) => _EventCard(
                  event: event,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => EventDetailScreen(event)),
                  ),
                ),
              );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.campusEventsTitle, actions: [
        // The viewer's own seats (mobile twin of web /events/registrations).
        ThuieIconButton(
          icon: LucideIcons.ticket,
          tooltip: L10n.myRegistrationsTitle,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const MyRegistrationsScreen()),
          ),
        ),
      ]),
      body: Column(children: [
        SizedBox(
          height: 44,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            itemCount: _filters.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final selected = i == _selectedFilter;
              return GestureDetector(
                onTap: () {
                  setState(() => _selectedFilter = i);
                  notifier.setType(_filterTypes[i]);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: selected ? c.accent : c.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: selected ? c.accent : c.hairline, width: 0.5),
                  ),
                  child: Text(_filters[i], style: TextStyle(
                    fontSize: 13, fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    color: selected ? c.onAccent : c.ink2,
                  )),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 4),
        Expanded(child: RefreshIndicator(onRefresh: () async {
          await notifier.load(refresh: true);
          await notifier.loadMine();
        }, child: body)),
      ]),
    );
  }
}

class _EventCard extends StatelessWidget {
  final CampusEvent event;
  final VoidCallback? onTap;

  const _EventCard({required this.event, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final isPast = event.isEnded;
    final spotsLeft = event.spotsLeft;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(ThuieRadii.lg),
          border: Border.all(color: c.hairline, width: 0.5),
          boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
          width: double.infinity,
          padding: const EdgeInsets.all(ThuieSpace.lg),
          decoration: BoxDecoration(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(ThuieRadii.lg)),
            gradient: LinearGradient(colors: eventGradient(event.type), begin: Alignment.topLeft, end: Alignment.bottomRight),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(ThuieRadii.lg)),
                child: Text(eventTypeLabel(event.type), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
              const Spacer(),
              if (isPast)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(ThuieRadii.lg)),
                  child: Text(L10n.endedLabel, style: TextStyle(color: Colors.white70, fontSize: 11)),
                ),
            ]),
            const SizedBox(height: 10),
            Text(event.title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(event.description, style: const TextStyle(color: Colors.white70, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(children: [
            Row(children: [
              Icon(LucideIcons.calendar, size: 14, color: c.muted),
              const SizedBox(width: 6),
              Text('${L10n.monthDay(event.date.month, event.date.day)} ${event.date.hour}:${event.date.minute.toString().padLeft(2, '0')}',
                style: TextStyle(fontSize: 13, color: c.ink2)),
              const SizedBox(width: 16),
              Icon(LucideIcons.mapPin, size: 14, color: c.muted),
              const SizedBox(width: 6),
              Text(event.location, style: TextStyle(fontSize: 13, color: c.ink2)),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              Icon(LucideIcons.users, size: 14, color: c.muted),
              const SizedBox(width: 6),
              Text('${event.registeredCount}/${event.capacity}', style: TextStyle(fontSize: 12, color: c.muted)),
              const SizedBox(width: 4),
              if (!isPast && spotsLeft > 0)
                Text(L10n.spotsLeftLabel(spotsLeft), style: TextStyle(fontSize: 12, color: spotsLeft < 20 ? c.danger : c.ok)),
              const Spacer(),
              Text('${L10n.organizerPrefix}${event.organizer}', style: TextStyle(fontSize: 12, color: c.muted)),
            ]),
          ]),
        ),
      ]),
      ),
    );
  }
}
