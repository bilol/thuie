import '../models.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// Which side of a mentorship pairing the application list is read from
/// (`GET /mentorship/applications?role=…`): applications sent *to* me as a
/// mentor, or applications I sent *as* a mentee.
enum MentorshipRole { incoming, outgoing }

String _roleWire(MentorshipRole r) =>
    r == MentorshipRole.incoming ? 'incoming' : 'outgoing';

/// `GET /mentors` + `POST /me/mentor-profile` and the `/mentorship/applications`
/// lifecycle (§6.11).
///
/// The mentors browse list is the paginated feed. Applications are queried per
/// role, so they are kept in a small side table (like connections) rather than
/// the base `items`. There is **no** `GET /me/mentor-profile`, so the client
/// cannot read back its own mentor record — becoming a mentor is submit-only and
/// the accept path lets the server enforce `max_mentees` (`409`).
class MentorshipNotifier extends PaginatedNotifier<MentorProfile> {
  @override
  String get resourcePath => '/mentors';

  String? area;

  @override
  Map<String, dynamic> get baseQuery => {
        if (area != null && area!.isNotEmpty) 'area': area,
      };

  @override
  Page<MentorProfile> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, MentorProfile.fromJson);

  MentorProfile? byId(String id) {
    for (final m in items) {
      if (m.id == id) return m;
    }
    return null;
  }

  /// Mentor by owning **user** id — the mentor detail screen is opened with a
  /// user id (applications and `/alumni/:id` are keyed on it), not the mentor
  /// profile id.
  MentorProfile? byUserId(String userId) {
    for (final m in items) {
      if (m.userId == userId) return m;
    }
    return null;
  }

  Future<void> setArea(String? value) async {
    if (area == value) return;
    area = value;
    await reload();
  }

  // -------------------------------------------------------------- applications --

  final Map<MentorshipRole, List<MentorshipApplication>> _apps = {
    for (final r in MentorshipRole.values) r: const <MentorshipApplication>[],
  };
  final Map<MentorshipRole, String?> _appsCursor = {
    for (final r in MentorshipRole.values) r: null,
  };
  final Map<MentorshipRole, bool> _appsLoading = {
    for (final r in MentorshipRole.values) r: false,
  };
  final Map<MentorshipRole, bool> _appsLoaded = {
    for (final r in MentorshipRole.values) r: false,
  };

  List<MentorshipApplication> applicationsOf(MentorshipRole role) => _apps[role]!;
  bool isLoadingApplications(MentorshipRole role) => _appsLoading[role] ?? false;
  bool hasMoreApplications(MentorshipRole role) => _appsCursor[role] != null;

  /// True when the viewer already has a *pending* application out to this mentor
  /// (matched on the mentor's **user** id, since apps reference user ids).
  bool hasAppliedTo(String mentorUserId) => _apps[MentorshipRole.outgoing]!
      .any((a) => a.mentorId == mentorUserId && a.status == MentorshipStatus.pending);

  MentorshipApplication? pendingApplicationTo(String mentorUserId) {
    for (final a in _apps[MentorshipRole.outgoing]!) {
      if (a.mentorId == mentorUserId && a.status == MentorshipStatus.pending) {
        return a;
      }
    }
    return null;
  }

  Future<void> loadApplications(MentorshipRole role, {bool refresh = false}) async {
    if (_appsLoading[role] ?? false) return;
    if (!refresh && (_appsLoaded[role] ?? false)) return;
    _appsLoading[role] = true;
    notifyListeners();
    try {
      final json = await api.get('/mentorship/applications',
          query: {'role': _roleWire(role), 'limitRaw': 20});
      final page = Page.cursor(json, MentorshipApplication.fromJson);
      _apps[role] = page.items;
      _appsCursor[role] = page.nextCursor;
      _appsLoaded[role] = true;
    } catch (_) {
      // leave the previous page untouched
    } finally {
      _appsLoading[role] = false;
      notifyListeners();
    }
  }

  Future<void> _refreshApplications() async {
    for (final r in MentorshipRole.values) {
      await loadApplications(r, refresh: true);
    }
  }

  /// `POST /me/mentor-profile` — register as a mentor (verified accounts only).
  Future<MentorProfile?> becomeMentor({
    required String expertise,
    String? mentorArea,
    int maxMentees = 3,
  }) {
    return guard<MentorProfile>(() async {
      final json = await api.post('/me/mentor-profile', data: {
        'expertise': expertise,
        if (mentorArea != null && mentorArea.isNotEmpty) 'mentor_area': mentorArea,
        'max_mentees': maxMentees,
      });
      final created = MentorProfile.fromJson(unwrapObject(json));
      upsert(created, (m) => m.id == created.id);
      return created;
    });
  }

  /// `POST /mentorship/applications` — apply to mentor [mentorUserId].
  Future<bool> apply(String mentorUserId, {String? message}) async {
    final r = await guard(() => api.post('/mentorship/applications', data: {
          'mentor_user_id': mentorUserId,
          if (message != null && message.isNotEmpty) 'message': message,
        }));
    if (r != null) await _refreshApplications();
    return r != null;
  }

  /// `PATCH /mentorship/applications/:id` — mentor accepts / rejects.
  Future<bool> respond(String id, {required bool accept}) async {
    final r = await guard(() => api.patch('/mentorship/applications/$id', data: {
          'status': accept ? 'accepted' : 'rejected',
        }));
    if (r != null) await _refreshApplications();
    return r != null;
  }

  /// `DELETE /mentorship/applications/:id` — mentee withdraws / either party ends.
  Future<bool> close(String id) async {
    final r = await guard(() => api.delete('/mentorship/applications/$id'));
    if (r != null) await _refreshApplications();
    return r != null;
  }
}
