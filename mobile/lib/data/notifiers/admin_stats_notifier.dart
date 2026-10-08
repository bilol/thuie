import 'package:flutter/foundation.dart';

import '../remote/api_client.dart';
import '../remote/api_error.dart';
import '../remote/async_status.dart';
import '../remote/json_utils.dart';

/// §6.17 dashboard counters from `GET /admin/stats`. The endpoint returns one
/// flat aggregate object (not the per-breakdown rollups the old mock computed
/// in-memory), so the console now shows exactly these server-authoritative
/// numbers.
class AdminStats {
  final int totalUsers;
  final int totalInfos;
  final int totalPosts;
  final int totalProfiles;
  final int pendingReview;
  final int openReports;
  final int oldestOpenReportHours;
  final int dau;
  final int wau;
  final int signups7d;

  const AdminStats({
    this.totalUsers = 0,
    this.totalInfos = 0,
    this.totalPosts = 0,
    this.totalProfiles = 0,
    this.pendingReview = 0,
    this.openReports = 0,
    this.oldestOpenReportHours = 0,
    this.dau = 0,
    this.wau = 0,
    this.signups7d = 0,
  });

  factory AdminStats.fromJson(Map<String, dynamic> j) => AdminStats(
        totalUsers: asInt(j['total_users']),
        totalInfos: asInt(j['total_infos']),
        totalPosts: asInt(j['total_posts']),
        totalProfiles: asInt(j['total_profiles']),
        pendingReview: asInt(j['pending_review']),
        openReports: asInt(j['open_reports']),
        oldestOpenReportHours: asInt(j['oldest_open_report_hours']),
        dau: asInt(j['dau']),
        wau: asInt(j['wau']),
        signups7d: asInt(j['signups_7d']),
      );
}

/// Loader for [AdminStats], shared by the admin home and the analytics screen.
class AdminStatsNotifier extends ChangeNotifier {
  AdminStatsNotifier({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;

  AsyncStatus status = AsyncStatus.idle;
  ApiError? error;
  AdminStats stats = const AdminStats();

  Future<void> load({bool refresh = false}) async {
    if (status == AsyncStatus.loading) return;
    if (!refresh && status == AsyncStatus.ready) return;
    status = AsyncStatus.loading;
    error = null;
    notifyListeners();
    try {
      final json = await _api.get('/admin/stats');
      stats = AdminStats.fromJson(unwrapObject(json));
      status = AsyncStatus.ready;
    } on ApiError catch (e) {
      error = e;
      status = AsyncStatus.error;
    } catch (_) {
      status = AsyncStatus.error;
    }
    notifyListeners();
  }
}
