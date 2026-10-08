import '../remote/json_utils.dart';
import 'campus_event.dart';

/// One attendee on an event's registration roster (`GET /events/:id/registrations`,
/// §6.10 organizer/admin view). `status` carries the wire value
/// `registered` / `attended`; cancelled seats are never returned.
class EventRegistrant {
  final String userId;
  final String name;
  final String? studentId;
  final String? avatarUrl;
  final String status;
  final DateTime registeredAt;
  final DateTime? usedAt;

  const EventRegistrant({
    required this.userId,
    required this.name,
    this.studentId,
    this.avatarUrl,
    required this.status,
    required this.registeredAt,
    this.usedAt,
  });

  bool get attended => status == 'attended';

  factory EventRegistrant.fromJson(Map<String, dynamic> j) => EventRegistrant(
        userId: asId(j['user_id']),
        name: asString(j['name']),
        studentId: asStringOrNull(j['student_id']),
        avatarUrl: asStringOrNull(j['avatar_url']),
        status: asString(j['status'], orElse: 'registered'),
        registeredAt: asDate(j['registered_at']),
        usedAt: asDateOrNull(j['used_at']),
      );
}

/// Roster envelope for one event: the active registrations plus the summary
/// counts the admin detail screen renders as a header line.
class EventRegistrations {
  final String eventId;
  final int total;
  final int attended;
  final int? capacity;
  final List<EventRegistrant> data;

  const EventRegistrations({
    required this.eventId,
    required this.total,
    required this.attended,
    this.capacity,
    required this.data,
  });

  factory EventRegistrations.fromJson(Map<String, dynamic> j) {
    final rows = (j['data'] as List?) ?? const [];
    return EventRegistrations(
      eventId: asId(j['event_id']),
      total: asInt(j['total']),
      attended: asInt(j['attended']),
      capacity: asIntOrNull(j['capacity']),
      data: [
        for (final e in rows.whereType<Map>())
          EventRegistrant.fromJson(Map<String, dynamic>.from(e)),
      ],
    );
  }
}

/// The viewer's own seat on one event (`GET /me/event-registrations`, §6.10).
/// The server embeds the full public event view so the "My Registrations" screen
/// can render title / cover / schedule without a second fetch. Cancelled seats
/// are never returned, so `status` is `registered` or `attended`.
class MyEventRegistration {
  final String eventId;
  final String status;
  final DateTime registeredAt;
  final DateTime? usedAt;
  final bool hasTicket;
  final CampusEvent? event;

  const MyEventRegistration({
    required this.eventId,
    required this.status,
    required this.registeredAt,
    this.usedAt,
    required this.hasTicket,
    this.event,
  });

  bool get attended => status == 'attended';

  factory MyEventRegistration.fromJson(Map<String, dynamic> j) {
    final ev = j['event'];
    return MyEventRegistration(
      eventId: asId(j['event_id']),
      status: asString(j['status'], orElse: 'registered'),
      registeredAt: asDate(j['registered_at']),
      usedAt: asDateOrNull(j['used_at']),
      hasTicket: asBool(j['has_ticket']),
      event: ev is Map ? CampusEvent.fromJson(Map<String, dynamic>.from(ev)) : null,
    );
  }
}
