import '../models.dart';
import '../remote/api_error.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// A first-degree connection peer as returned by `GET /alumni/:id/connections`
/// (`{user_id, name, role, avatar_url}`), kept tiny for the detail view.
typedef AlumniConnection = ({String id, String name, Role role, String? avatarUrl});

/// `GET /alumni` browse + `GET /alumni/:id` detail and the caller's own profile
/// lifecycle (`/me/alumni-profile*`) (§6.5). The server applies visibility +
/// moderation, so the feed already holds only approved, viewer-visible rows —
/// the old client-side `visibleProfiles` role filter is gone.
class AlumniNotifier extends PaginatedNotifier<AlumniProfile> {
  @override
  String get resourcePath => '/alumni';

  /// Server-side `graduation_year` / free-text `q` filters (null = all).
  String? graduationYear;
  String? q;

  @override
  Map<String, dynamic> get baseQuery => {
        if (graduationYear != null) 'graduation_year': graduationYear,
        if (q != null && q!.isNotEmpty) 'q': q,
      };

  @override
  Page<AlumniProfile> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, AlumniProfile.fromJson);

  Future<void> setQuery(String? value) async {
    if (q == value) return;
    q = value;
    await reload();
  }

  Future<void> setGraduationYear(String? value) async {
    if (graduationYear == value) return;
    graduationYear = value;
    await reload();
  }

  // ------------------------------------------------------------- own profile --

  /// `GET /me/alumni-profile` — the caller's own row (with contact + status), or
  /// null when they have none yet (the endpoint 404s, which is not an error).
  Future<AlumniProfile?> loadOwn() async {
    try {
      final json = await api.get('/me/alumni-profile');
      final obj = unwrapObject(json);
      if (obj.isEmpty) return null;
      return AlumniProfile.fromJson(obj);
    } on ApiError {
      return null;
    }
  }

  /// `POST /me/alumni-profile` — first submission. Returns null on error.
  Future<AlumniProfile?> createProfile(Map<String, dynamic> body) async {
    return guard<AlumniProfile>(() async {
      final json = await api.post('/me/alumni-profile', data: body);
      return AlumniProfile.fromJson(unwrapObject(json));
    });
  }

  /// `PATCH /me/alumni-profile` — edit, sends `version` for the optimistic lock.
  Future<AlumniProfile?> updateProfile(Map<String, dynamic> body) async {
    return guard<AlumniProfile>(() async {
      final json = await api.patch('/me/alumni-profile', data: body);
      return AlumniProfile.fromJson(unwrapObject(json));
    });
  }

  /// `PUT /me/alumni-profile/skills` — idempotent full replacement.
  Future<AlumniProfile?> setSkills(List<String> skills) async {
    return guard<AlumniProfile>(() async {
      final json =
          await api.put('/me/alumni-profile/skills', data: {'skills': skills});
      return AlumniProfile.fromJson(unwrapObject(json));
    });
  }

  /// `POST /me/alumni-profile/visibility-request` — re-submit a visibility change
  /// for admin review.
  Future<bool> requestVisibility({
    ContentVisibility? visibility,
  }) async {
    final r = await guard(() => api.post('/me/alumni-profile/visibility-request',
        data: {
          if (visibility != null) 'visibility': enumToWire(visibility),
        }));
    return r != null;
  }

  // ----------------------------------------------------------------- helpers --

  /// Builds the create/edit wire body from a draft profile. `version` is only
  /// sent on update (the optimistic-concurrency lock); `avatarMediaId` links an
  /// uploaded §8 avatar and is only sent when a fresh image was picked.
  static Map<String, dynamic> profileBody(AlumniProfile d,
          {int? version, String? avatarMediaId}) =>
      {
        'display_name': d.displayName,
        if (d.departmentId != null) 'department': d.departmentId,
        if (d.graduationYear != null) 'graduation_year': d.graduationYear,
        if (d.gradeYear != null) 'grade_year': d.gradeYear,
        'program': d.program,
        'industry': d.industry,
        'country': d.country,
        'city': d.city,
        'nationality': d.nationality,
        'work_title': d.workTitle,
        'company': d.company,
        'bio': d.bio,
        'visibility': enumToWire(d.visibility),
        if (avatarMediaId != null) 'avatar_media_id': avatarMediaId,
        if (version != null) 'version': version,
      };

  /// `GET /alumni/:id/connections` — the profile owner's accepted peers.
  Future<List<AlumniConnection>> connectionsFor(String profileId) async {
    final r = await guard(() => api.get('/alumni/$profileId/connections'));
    if (r == null) return const [];
    final data = (r['data'] as List?) ?? const [];
    return data.whereType<Map>().map((e) {
      final m = Map<String, dynamic>.from(e);
      return (
        id: asId(m['user_id'] ?? m['id']),
        name: asString(m['name']),
        role: enumFromWire(Role.values, m['role'], fallback: Role.student),
        avatarUrl: asStringOrNull(m['avatar_url']),
      );
    }).toList();
  }
}
