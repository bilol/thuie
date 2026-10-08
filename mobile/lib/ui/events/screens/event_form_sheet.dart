import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/event_visuals.dart';

/// Event add/edit bottom sheet (§6.10). With no [event] it creates one
/// (`POST /events`, via [EventsNotifier.createEvent]); with an [event] it
/// prefills the form and patches it (`PATCH /events/:id`, via
/// [EventsNotifier.updateEvent]). Both mutate the shared [EventsNotifier] feed,
/// so the admin list and any open detail refresh from the returned row.
void showEventFormSheet(BuildContext context, {CampusEvent? event}) {
  final events = context.read<EventsNotifier>();
  final messenger = ScaffoldMessenger.of(context);
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _EventFormSheet(
      event: event,
      onSubmit: (title, desc, date, location, capacity, type) {
        if (event == null) {
          events.createEvent(
            title: title,
            description: desc,
            startsAt: date,
            location: location,
            organizer: L10n.schoolOffice,
            capacity: capacity,
            type: type,
          );
          messenger.showSnackBar(SnackBar(
              content: Text(L10n.eventCreatedToast),
              duration: const Duration(seconds: 1)));
        } else {
          events.updateEvent(
            event.id,
            title: title,
            description: desc,
            startsAt: date,
            location: location,
            capacity: capacity,
            type: type,
          );
          messenger.showSnackBar(SnackBar(
              content: Text(L10n.eventSaved),
              duration: const Duration(seconds: 1)));
        }
      },
    ),
  );
}

class _EventFormSheet extends StatefulWidget {
  final CampusEvent? event;
  final void Function(String title, String desc, DateTime date, String location,
      int capacity, EventType type) onSubmit;
  const _EventFormSheet({this.event, required this.onSubmit});

  @override
  State<_EventFormSheet> createState() => _EventFormSheetState();
}

class _EventFormSheetState extends State<_EventFormSheet> {
  late String _title = widget.event?.title ?? '';
  late String _desc = widget.event?.description ?? '';
  late String _location = widget.event?.location ?? '';
  late String _capacity = (widget.event?.capacity ?? 100).toString();
  late DateTime _date = widget.event?.date ?? DateTime.now().add(const Duration(days: 7));
  late EventType _type = widget.event?.type ?? EventType.other;
  String? _error;

  bool get _isEdit => widget.event != null;

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_isEdit ? L10n.editEvent : L10n.createEvent, style: c.titleMedium),
          const SizedBox(height: 12),
          FlatField(value: _title, onChanged: (v) => _title = v, label: L10n.titleLabel),
          const SizedBox(height: 10),
          FlatField(value: _desc, onChanged: (v) => _desc = v, label: L10n.eventDescField, singleLine: false, maxLines: 3),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  final picked = await showDatePicker(
                      context: context,
                      initialDate: _date,
                      firstDate: widget.event?.date ?? DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 3650)));
                  if (picked != null) setState(() => _date = picked);
                },
                icon: const Icon(LucideIcons.calendarDays, size: 16),
                label: Text('${L10n.eventDateField} ${_date.year}-${_date.month}-${_date.day}'),
              ),
            ),
          ]),
          const SizedBox(height: 10),
          FlatField(value: _location, onChanged: (v) => _location = v, label: L10n.location),
          const SizedBox(height: 10),
          FlatField(value: _capacity, onChanged: (v) => _capacity = v, label: L10n.eventCapacityField),
          const SizedBox(height: 12),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final t in EventType.values)
              GestureDetector(
                onTap: () => setState(() => _type = t),
                child: Seal(text: eventTypeLabel(t), tone: t == _type ? SealTone.accent : SealTone.neutral, filled: t == _type),
              ),
          ]),
          if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(
            label: _isEdit ? L10n.save : L10n.submitLabel,
            onTap: () {
              if (_title.trim().isEmpty || _location.trim().isEmpty) {
                setState(() => _error = '${L10n.titleLabel} / ${L10n.location}');
                return;
              }
              final capacity = int.tryParse(_capacity) ?? 100;
              widget.onSubmit(_title.trim(), _desc.trim(), _date, _location.trim(), capacity, _type);
              Navigator.pop(context);
            },
          ),
        ]),
      ),
    );
  }
}
