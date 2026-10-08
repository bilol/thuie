import '../models/operation_log.dart';
import '../remote/page.dart';
import 'offset_notifier.dart';

/// §6.17 admin audit trail. `GET /admin/operation-logs` (offset paged,
/// newest-first): who did what to which target, with the JSONB detail rendered
/// as a string by [OperationLog.fromJson].
class AdminLogsNotifier extends OffsetNotifier<OperationLog> {
  AdminLogsNotifier({super.api});

  @override
  String get resourcePath => '/admin/operation-logs';

  @override
  Page<OperationLog> decodePage(Map<String, dynamic> json) =>
      Page.offset(json, OperationLog.fromJson);

  @override
  OperationLog decodeRow(Map<String, dynamic> json) => OperationLog.fromJson(json);

  /// Empties the audit trail (`DELETE /admin/operation-logs`). Returns the
  /// number of rows removed, or null on failure (reason in [error]). The backend
  /// re-logs the clear, so the list reloads showing one new entry.
  Future<int?> clearLogs() async {
    final res = await guard<Map<String, dynamic>>(() => api.delete(resourcePath));
    if (res == null) return null;
    final deleted = res['deleted'];
    await reload();
    return deleted is int ? deleted : 0;
  }
}
