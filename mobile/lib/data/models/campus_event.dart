import '../remote/json_utils.dart';

enum EventType { recruitment, lecture, sharing, ceremony, sports, other }

extension EventTypeLabel on EventType {
  String label() {
    switch (this) {
      case EventType.recruitment: return '招聘';
      case EventType.lecture: return '讲座';
      case EventType.sharing: return '分享';
      case EventType.ceremony: return '庆典';
      case EventType.sports: return '体育';
      case EventType.other: return '其他';
    }
  }
}

class CampusEvent {
  final String id;
  final String title;
  final String description;
  final DateTime date;
  final String location;
  final String organizer;
  final int capacity;
  final int registeredCount;
  final EventType type;
  final List<String> attendeeUserIds;
  final List<String> checkedInIds;
  final bool cancelled;
  final DateTime? endDate;
  final String? imageUrl;
  final DateTime createdAt;

  /// Whether the *viewer* holds a seat — derived from `my_status` on detail.
  final bool registered;

  /// The viewer's registration row status (`registered`/`attended`/`cancelled`),
  /// detail-only via `my_status`.
  final String? myStatus;

  CampusEvent({
    required this.id,
    required this.title,
    required this.description,
    required this.date,
    required this.location,
    required this.organizer,
    this.capacity = 100,
    this.registeredCount = 0,
    this.type = EventType.other,
    List<String>? attendeeUserIds,
    List<String>? checkedInIds,
    this.cancelled = false,
    this.endDate,
    this.imageUrl,
    this.registered = false,
    this.myStatus,
    DateTime? createdAt,
  })  : attendeeUserIds = attendeeUserIds ?? [],
        checkedInIds = checkedInIds ?? [],
        createdAt = createdAt ?? DateTime.now();

  bool get isEnded => endDate != null ? DateTime.now().isAfter(endDate!) : DateTime.now().isAfter(date.add(const Duration(hours: 3)));
  int get spotsLeft => capacity - registeredCount;
  bool get checkedIn => myStatus == 'attended';
  bool isCheckedIn(String userId) => checkedInIds.contains(userId);

  CampusEvent copyWith({
    String? id,
    String? title,
    String? description,
    DateTime? date,
    String? location,
    String? organizer,
    int? capacity,
    int? registeredCount,
    EventType? type,
    List<String>? attendeeUserIds,
    List<String>? checkedInIds,
    bool? cancelled,
    DateTime? endDate,
    String? imageUrl,
    bool? registered,
    String? myStatus,
    DateTime? createdAt,
  }) {
    return CampusEvent(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      date: date ?? this.date,
      location: location ?? this.location,
      organizer: organizer ?? this.organizer,
      capacity: capacity ?? this.capacity,
      registeredCount: registeredCount ?? this.registeredCount,
      type: type ?? this.type,
      attendeeUserIds: attendeeUserIds ?? this.attendeeUserIds,
      checkedInIds: checkedInIds ?? this.checkedInIds,
      cancelled: cancelled ?? this.cancelled,
      endDate: endDate ?? this.endDate,
      imageUrl: imageUrl ?? this.imageUrl,
      registered: registered ?? this.registered,
      myStatus: myStatus ?? this.myStatus,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /events*` row (§6.10). `description` is detail-only; `date` is
  /// `starts_at`; `cancelled` is derived from `status`. The wire overloads
  /// `registered` (list = an int head-count, detail = a viewer bool), so the
  /// head-count is taken from `spots_left`/`capacity` when present and the
  /// viewer flag is derived from `my_status`.
  factory CampusEvent.fromJson(Map<String, dynamic> j) {
    final status = asString(j['status']);
    final myStatus = asStringOrNull(j['my_status']);
    final capacity = asInt(j['capacity'], orElse: 100);
    final spotsLeft = asIntOrNull(j['spots_left']);
    final regRaw = j['registered'];
    final headCount = spotsLeft != null
        ? (capacity - spotsLeft).clamp(0, capacity).toInt()
        : (regRaw is int ? regRaw : 0);
    return CampusEvent(
      id: asId(j['id']),
      title: asString(j['title']),
      description: asString(j['description']),
      date: asDate(j['starts_at'] ?? j['date']),
      location: asString(j['location']),
      organizer: asString(j['organizer']),
      capacity: capacity,
      registeredCount: headCount,
      type: enumFromWire(EventType.values, j['type'], fallback: EventType.other),
      cancelled: status == 'cancelled',
      endDate: asDateOrNull(j['ends_at']),
      imageUrl: asStringOrNull(j['cover_url']),
      registered: myStatus != null && myStatus != 'cancelled',
      myStatus: myStatus,
      createdAt: asDate(j['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'starts_at': date.toIso8601String(),
        'ends_at': endDate?.toIso8601String(),
        'location': location,
        'organizer': organizer,
        'type': enumToWire(type),
        'capacity': capacity,
        'status': cancelled ? 'cancelled' : 'published',
        'created_at': createdAt.toIso8601String(),
      };
}
