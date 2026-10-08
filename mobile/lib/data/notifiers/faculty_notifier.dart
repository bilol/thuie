import '../models.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// `GET /faculty` + `GET /faculty/:id` (§6.6). Official, admin-maintained data —
/// reads are open to any authenticated viewer. The admin console reuses this
/// feed for browsing and drives the §6.6 write path (`POST`/`PATCH`/`DELETE
/// /admin/faculty`) through [create]/[update]/[remove] below. Rows already carry
/// the nested `department`, so the notifier collapses it to a display name via
/// [FacultyMember.fromJson] (and keeps its `code` for the edit form).
class FacultyNotifier extends PaginatedNotifier<FacultyMember> {
  @override
  String get resourcePath => '/faculty';

  /// Optional server-side department (code or id) + free-text `q`.
  String? department;
  String? q;

  @override
  Map<String, dynamic> get baseQuery => {
        if (department != null) 'department': department,
        if (q != null && q!.isNotEmpty) 'q': q,
      };

  @override
  Page<FacultyMember> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, FacultyMember.fromJson);

  FacultyMember? byId(String id) {
    for (final f in items) {
      if (f.id == id) return f;
    }
    return null;
  }

  Future<void> setQuery(String? value) async {
    if (q == value) return;
    q = value;
    await reload();
  }

  // ------------------------------------------------------- admin writes ----

  /// `POST /admin/faculty` — [body] uses the §6.6 `CreateFacultyDto` keys
  /// (`name`, `department` = code, `title`, `research_area`, `email`, `phone`,
  /// `bio`). Prepends the returned row so the new member shows without a reload.
  Future<FacultyMember?> create(Map<String, dynamic> body) async {
    final r = await guard(() => api.post('/admin/faculty', data: body));
    if (r == null) return null;
    final created = FacultyMember.fromJson(unwrapObject(r));
    items = [created, ...items];
    notifyListeners();
    return created;
  }

  /// `PATCH /admin/faculty/:id` — replaces the cached row with the server echo.
  Future<bool> updateFaculty(String id, Map<String, dynamic> body) async {
    final r = await guard(() => api.patch('/admin/faculty/$id', data: body));
    if (r == null) return false;
    upsert(FacultyMember.fromJson(unwrapObject(r)), (o) => o.id == id);
    return true;
  }

  /// `DELETE /admin/faculty/:id`.
  Future<bool> removeFaculty(String id) async {
    final r = await guard(() => api.delete('/admin/faculty/$id'));
    if (r == null) return false;
    removeWhere((f) => f.id == id);
    return true;
  }
}
