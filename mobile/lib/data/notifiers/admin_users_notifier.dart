import '../models/user.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'offset_notifier.dart';

/// §6.17 user-admin console. `GET /admin/users` (offset paged, filterable by
/// role/status/free-text `q`), `PATCH /admin/users/:id` (status changes:
/// restrict / ban / restore), `POST /admin/users/:id/convert` (single
/// student→graduate conversion) and `POST /admin/users/convert` (batch).
class AdminUsersNotifier extends OffsetNotifier<User> {
  AdminUsersNotifier({super.api, this.roleFilter, this.statusFilter, this.query});

  /// Optional role (`student` | `graduate` | …) scoping the search.
  final String? roleFilter;
  final String? statusFilter;
  final String? query;

  @override
  String get resourcePath => '/admin/users';

  @override
  Map<String, dynamic> get baseQuery => {
        if (roleFilter != null) 'role': roleFilter,
        if (statusFilter != null) 'status': statusFilter,
        if (query != null && query!.isNotEmpty) 'q': query,
      };

  @override
  Page<User> decodePage(Map<String, dynamic> json) => Page.offset(json, User.fromJson);

  @override
  User decodeRow(Map<String, dynamic> json) => User.fromJson(json);

  /// `PATCH /admin/users/:id` — sets [status] and swaps the row in place.
  Future<bool> updateStatus(String id, UserStatus status) async {
    final r = await guard(() =>
        api.patch('/admin/users/$id', data: {'status': enumToWire(status)}));
    if (r != null) {
      final updated = User.fromJson(unwrapObject(r));
      final idx = items.indexWhere((u) => u.id == id);
      if (idx != -1) items = [...items]..[idx] = updated;
      notifyListeners();
      return true;
    }
    return false;
  }

  /// `POST /admin/users/:id/convert` — student→graduate ([force] bypasses the
  /// role guard, [graduationYear] is a 4-digit string).
  Future<bool> convert(String id, {String? graduationYear, bool force = false}) async {
    final r = await guard(() => api.post('/admin/users/$id/convert', data: {
          if (graduationYear != null && graduationYear.isNotEmpty)
            'graduation_year': graduationYear,
          if (force) 'force': true,
        }));
    if (r != null) {
      final updated = User.fromJson(unwrapObject(r));
      final idx = items.indexWhere((u) => u.id == id);
      if (idx != -1) items = [...items]..[idx] = updated;
      notifyListeners();
      return true;
    }
    return false;
  }

  /// `POST /admin/users/convert` — batch, `items:[{user_id, graduation_year?}]`.
  Future<bool> batchConvert(List<Map<String, dynamic>> entries) async {
    final r = await guard(
        () => api.post('/admin/users/convert', data: {'items': entries}));
    if (r != null) {
      await reload();
      return true;
    }
    return false;
  }

  /// Applies [status] to many users via `PATCH /admin/users/:id` (there is no
  /// batch status route server-side). Reloads the list afterwards and reports
  /// whether every call succeeded; [error] holds the last failure if any.
  Future<bool> bulkUpdateStatus(List<String> ids, UserStatus status) async {
    var allOk = true;
    for (final id in ids) {
      final r = await guard(() =>
          api.patch('/admin/users/$id', data: {'status': enumToWire(status)}));
      if (r == null) allOk = false;
    }
    await reload();
    return allOk;
  }
}
