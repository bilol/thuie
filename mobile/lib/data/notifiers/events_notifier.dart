import '../models.dart';
import '../remote/api_error.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// `GET /events` (+ `/events/:id`) and the registration / ticket lifecycle
/// (`/events/:id/register`, `/ticket`, `/check-in`) plus `GET /me/event-registrations`
/// (§6.10).
///
/// The list rows carry the *head-count* in `registered` and no viewer flag, so
/// per-viewer state (`isRegistered` / `isCheckedIn`) is layered on from the
/// caller's own registrations, fetched separately into [_myStatus]. The detail
/// endpoint returns `registered` as a viewer bool + `my_status`.
class EventsNotifier extends PaginatedNotifier<CampusEvent> {
  @override
  String get resourcePath => '/events';

  EventType? type;

  @override
  Map<String, dynamic> get baseQuery => {
        if (type != null) 'type': enumToWire(type!),
      };

  @override
  Page<CampusEvent> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, CampusEvent.fromJson);

  CampusEvent? byId(String id) {
    for (final e in items) {
      if (e.id == id) return e;
    }
    return null;
  }

  Future<void> setType(EventType? value) async {
    if (type == value) return;
    type = value;
    await reload();
  }

  // ------------------------------------------------- viewer registration state --

  final Map<String, String> _myStatus = {};
  bool _mineLoaded = false;
  bool get mineLoaded => _mineLoaded;

  bool isRegistered(String eventId) {
    final s = _myStatus[eventId];
    return s != null && s != 'cancelled';
  }

  bool isCheckedIn(String eventId) => _myStatus[eventId] == 'attended';

  /// `GET /me/event-registrations` — the viewer's seats across all events.
  Future<void> loadMine() async {
    try {
      final json = await api.get('/me/event-registrations');
      final data = (json['data'] as List?) ?? const [];
      _myStatus.clear();
      for (final e in data.whereType<Map>()) {
        final m = Map<String, dynamic>.from(e);
        _myStatus[asId(m['event_id'])] = asString(m['status']);
      }
      _mineLoaded = true;
      notifyListeners();
    } on ApiError {
      // a failed registrations pull just leaves the chips unresolved
    }
  }

  /// `GET /me/event-registrations` — the viewer's own seats with the embedded
  /// event view, for the "My Registrations" screen. Also refreshes the chip map
  /// so the feed stays in sync. Returns an empty list on error.
  Future<List<MyEventRegistration>> fetchMyRegistrations() async {
    try {
      final json = await api.get('/me/event-registrations');
      final data = (json['data'] as List?) ?? const [];
      final regs = <MyEventRegistration>[
        for (final e in data.whereType<Map>())
          MyEventRegistration.fromJson(Map<String, dynamic>.from(e)),
      ];
      _myStatus
        ..clear()
        ..addEntries(regs.map((r) => MapEntry(r.eventId, r.status)));
      _mineLoaded = true;
      notifyListeners();
      return regs;
    } on ApiError {
      return const [];
    }
  }

  /// `POST /events/:id/register`. Capacity is enforced server-side (`409`).
  Future<bool> register(String eventId) async {
    final r = await guard(() => api.post('/events/$eventId/register'));
    if (r == null) return false;
    _myStatus[eventId] = 'registered';
    _bump(eventId, 1);
    notifyListeners();
    return true;
  }

  /// `DELETE /events/:id/register`.
  Future<bool> cancel(String eventId) async {
    final r = await guard(() => api.delete('/events/$eventId/register'));
    if (r == null) return false;
    _myStatus[eventId] = 'cancelled';
    _bump(eventId, -1);
    notifyListeners();
    return true;
  }

  /// `GET /events/:id/ticket` — the short-lived, signed check-in token.
  Future<String?> ticket(String eventId) async {
    final r = await guard(() => api.get('/events/$eventId/ticket'));
    if (r == null) return null;
    return asStringOrNull(r['ticket']);
  }

  /// `POST /events/:id/check-in` — organizer/admin scans a ticket.
  Future<bool> checkIn(String eventId, String ticket) async {
    final r = await guard(
        () => api.post('/events/$eventId/check-in', data: {'ticket': ticket}));
    return r != null;
  }

  /// `GET /events/:id/registrations` — organizer/admin roster (§6.10): who has
  /// signed up and who has checked in. The server restricts this to the event's
  /// organizer or an admin. Returns null on error (e.g. a 403 for non-managers).
  Future<EventRegistrations?> fetchRegistrations(String eventId) =>
      guard<EventRegistrations>(() async {
        final json = await api.get('/events/$eventId/registrations');
        return EventRegistrations.fromJson(json);
      });

  /// `GET /events/:id/attendees` — the public "who's going" roster (§6.10),
  /// available to any logged-in viewer. Identity only (name + avatar); the
  /// check-in state / student id stay in the manager-only [fetchRegistrations].
  /// Decodes into the same [EventRegistrations] envelope (check-in fields default
  /// off).
  Future<EventRegistrations?> fetchAttendees(String eventId) =>
      guard<EventRegistrations>(() async {
        final json = await api.get('/events/$eventId/attendees');
        return EventRegistrations.fromJson(json);
      });

  /// `POST /events` — admin create (§6.10, `@Roles('admin')`). Returns the
  /// created row (prepended to the feed) or null on error.
  Future<CampusEvent?> createEvent({
    required String title,
    required DateTime startsAt,
    String? description,
    String? location,
    String? organizer,
    EventType type = EventType.other,
    int capacity = 100,
  }) {
    return guard<CampusEvent>(() async {
      final json = await api.post('/events', data: {
        'title': title,
        'starts_at': startsAt.toIso8601String(),
        if (description != null && description.isNotEmpty) 'description': description,
        if (location != null && location.isNotEmpty) 'location': location,
        if (organizer != null && organizer.isNotEmpty) 'organizer': organizer,
        'type': enumToWire(type),
        'capacity': capacity,
      });
      final created = CampusEvent.fromJson(unwrapObject(json));
      upsert(created, (e) => e.id == created.id);
      return created;
    });
  }

  /// `PATCH /events/:id` — admin/organizer edit (§6.10). Mirrors [createEvent]'s
  /// field set (organizer isn't editable here) and upserts the returned full row.
  Future<CampusEvent?> updateEvent(
    String id, {
    required String title,
    required DateTime startsAt,
    String? description,
    String? location,
    EventType type = EventType.other,
    int capacity = 100,
  }) {
    return guard<CampusEvent>(() async {
      final json = await api.patch('/events/$id', data: {
        'title': title,
        'starts_at': startsAt.toIso8601String(),
        if (description != null && description.isNotEmpty) 'description': description,
        if (location != null && location.isNotEmpty) 'location': location,
        'type': enumToWire(type),
        'capacity': capacity,
      });
      final updated = CampusEvent.fromJson(unwrapObject(json));
      upsert(updated, (e) => e.id == updated.id);
      return updated;
    });
  }

  /// `PATCH /events/:id` with `status: cancelled` — admin cancel.
  Future<bool> cancelEvent(String id) async {
    final r = await guard(
        () => api.patch('/events/$id', data: {'status': 'cancelled'}));
    if (r == null) return false;
    final idx = items.indexWhere((e) => e.id == id);
    if (idx != -1) items = [...items]..[idx] = items[idx].copyWith(cancelled: true);
    notifyListeners();
    return true;
  }

  void _bump(String eventId, int delta) {
    final idx = items.indexWhere((e) => e.id == eventId);
    if (idx == -1) return;
    final e = items[idx];
    final next = (e.registeredCount + delta).clamp(0, e.capacity).toInt();
    items = [...items]..[idx] = e.copyWith(registeredCount: next);
  }
}
