import '../models.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// `POST /reports` + `GET /me/reports` (§6.12). Filing is the single canonical
/// endpoint; the per-target aliases (`/infos/:id/report`, …) are covered by the
/// owning feed notifiers. `GET /me/reports` lists what the caller has filed.
class ReportsNotifier extends PaginatedNotifier<Report> {
  @override
  String get resourcePath => '/me/reports';

  @override
  Page<Report> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, Report.fromJson);

  /// Files a report against any target. Server requires a verified account.
  Future<Report?> create({
    required TargetType targetType,
    required String targetId,
    required String reason,
  }) {
    return guard<Report>(() async {
      final json = await api.post('/reports', data: {
        'target_type': targetTypeToWire(targetType),
        'target_id': targetId,
        'reason': reason,
      });
      final created = Report.fromJson(unwrapObject(json));
      items = [created, ...items];
      notifyListeners();
      return created;
    });
  }
}
