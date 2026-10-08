import '../models/admin_feedback.dart';
import 'offset_notifier.dart';

/// §6.15/§6.17 admin feedback inbox. `GET /admin/feedback` is the standard
/// offset `{data, meta}` envelope, newest first, with an optional
/// `status` filter. `PATCH /admin/feedback/:id` posts a reply and/or moves the
/// thread (`open` → `answered` → `closed`); a reply notifies the author.
class AdminFeedbackNotifier extends OffsetNotifier<AdminFeedback> {
  AdminFeedbackNotifier({super.api, this.statusFilter});

  /// `open` / `answered` / `closed`; null shows every thread.
  final String? statusFilter;

  @override
  String get resourcePath => '/admin/feedback';

  @override
  Map<String, dynamic> get baseQuery =>
      statusFilter == null ? const {} : {'status': statusFilter};

  @override
  AdminFeedback decodeRow(Map<String, dynamic> json) => AdminFeedback.fromJson(json);

  /// Posts [text] as a reply (auto-advancing an `open` thread to `answered`)
  /// and/or sets [status]. The server echoes the updated row, applied in place
  /// so the thread stays visible across status changes.
  Future<bool> reply(String id, {String? text, String? status}) async {
    final r = await guard(() => api.patch('/admin/feedback/$id', data: {
          if (text != null && text.isNotEmpty) 'reply': text,
          if (status != null) 'status': status,
        }));
    if (r != null) {
      final updated = AdminFeedback.fromJson(r);
      items = items.map((e) => e.id == id ? updated : e).toList();
      notifyListeners();
      return true;
    }
    return false;
  }
}
