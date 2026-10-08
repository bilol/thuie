import '../models/report.dart';
import 'offset_notifier.dart';

/// §6.17 reports queue console. `GET /admin/reports` is the standard offset
/// `{data, meta}` envelope (now aligned with every other admin list), each row
/// carrying the nested `reporter` brief. `POST /admin/reports/:id/resolve`
/// closes a report with an outcome (`ignored` | `deleted` | `restricted`).
class AdminReportsNotifier extends OffsetNotifier<Report> {
  AdminReportsNotifier({super.api, this.statusFilter});

  /// Optional `open` / `resolved_*` filter; null defaults to the open queue.
  final String? statusFilter;

  @override
  String get resourcePath => '/admin/reports';

  @override
  Map<String, dynamic> get baseQuery =>
      statusFilter == null ? const {} : {'status': statusFilter};

  @override
  Report decodeRow(Map<String, dynamic> json) => Report.fromJson(json);

  /// `POST /admin/reports/:id/resolve` — [outcome] ∈ ignored|deleted|restricted.
  Future<bool> resolve(String id, String outcome, {String? note}) async {
    final r = await guard(() => api.post('/admin/reports/$id/resolve', data: {
          'outcome': outcome,
          if (note != null && note.isNotEmpty) 'note': note,
        }));
    if (r != null) {
      items = items.where((e) => e.id != id).toList();
      notifyListeners();
      return true;
    }
    return false;
  }
}
