import 'package:flutter/foundation.dart';

import '../models/enums.dart';
import '../models/role_strategy.dart';
import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';

/// §6.17 role-strategy flags (`admin_super` only). `GET /admin/role-strategies`
/// returns one row per role (`{role, can_*…}`); [of] exposes the cached view
/// keyed by [Role] so the console renders a toggle grid. Writes go through
/// `PATCH /admin/role-strategies` with the `role` plus the changed `can_*`
/// flags, then the server busts its 60 s strategy cache.
class AdminRoleStrategiesNotifier extends ChangeNotifier {
  AdminRoleStrategiesNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;

  AsyncStatus status = AsyncStatus.idle;
  ApiError? error;
  Map<Role, RoleStrategy> strategies = const {};

  RoleStrategy of(Role role) => strategies[role] ?? const RoleStrategy();

  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (!refresh && status == AsyncStatus.ready) return;
    status = AsyncStatus.loading;
    error = null;
    notifyListeners();
    try {
      final json = await _api.getList('/admin/role-strategies');
      final map = <Role, RoleStrategy>{};
      for (final row in Page.list(json, (m) => m).items) {
        final role = enumFromWire(Role.values, (row as Map)['role'], fallback: Role.student);
        map[role] = RoleStrategy.fromJson(Map<String, dynamic>.from(row));
      }
      strategies = map;
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    } catch (_) {
      status = AsyncStatus.error;
    }
    notifyListeners();
  }

  /// `PATCH /admin/role-strategies` — apply any subset of changed flags to [role].
  Future<bool> update(Role role, {
    bool? canViewInfo,
    bool? canViewInternal,
    bool? canViewAlumni,
    bool? canViewForum,
    bool? canSubmitInfo,
    bool? canPostForum,
    bool? canComment,
    bool? canCreateProfile,
  }) async {
    final r = await _guard(() => _api.patch('/admin/role-strategies', data: {
          'role': enumToWire(role),
          if (canViewInfo != null) 'can_view_info': canViewInfo,
          if (canViewInternal != null) 'can_view_internal': canViewInternal,
          if (canViewAlumni != null) 'can_view_alumni': canViewAlumni,
          if (canViewForum != null) 'can_view_forum': canViewForum,
          if (canSubmitInfo != null) 'can_submit_info': canSubmitInfo,
          if (canPostForum != null) 'can_post_forum': canPostForum,
          if (canComment != null) 'can_comment': canComment,
          if (canCreateProfile != null) 'can_create_profile': canCreateProfile,
        }));
    if (r != null) {
      await load(refresh: true);
      return true;
    }
    return false;
  }

  Future<Map<String, dynamic>?> _guard(
      Future<Map<String, dynamic>> Function() body) async {
    try {
      return await body();
    } on ApiError catch (e) {
      error = e;
      notifyListeners();
      return null;
    }
  }
}
