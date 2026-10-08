import '../models/moderation_action.dart';
import '../models/report.dart' show targetTypeToWire;
import '../models/enums.dart' show TargetType;
import '../models/review_item.dart';
import '../remote/page.dart';
import 'offset_notifier.dart';

/// §6.17 review-queue console. Backs `GET /admin/review` (offset paged), the
/// `POST /admin/review/:type/:id/approve|reject` and `POST /admin/takedown`
/// writes, and `GET /admin/moderation-history/:type/:id`. [typeFilter] scopes
/// the queue to a single target type (the info / post / profile screens pass
/// their own); a null filter shows the whole pending queue.
class AdminReviewNotifier extends OffsetNotifier<ReviewItem> {
  AdminReviewNotifier({super.api, this.typeFilter});

  /// Optional wire target type (`info_post` | `forum_post` | …) scoping the queue.
  final String? typeFilter;

  @override
  String get resourcePath => '/admin/review';

  @override
  Map<String, dynamic> get baseQuery =>
      typeFilter == null ? const {} : {'type': typeFilter};

  @override
  Page<ReviewItem> decodePage(Map<String, dynamic> json) =>
      Page.offset(json, ReviewItem.fromJson);

  @override
  ReviewItem decodeRow(Map<String, dynamic> json) => ReviewItem.fromJson(json);

  /// `POST /admin/review/:type/:id/approve`.
  Future<bool> approve(String type, String id) async {
    final r = await guard(() async => api.post('/admin/review/$type/$id/approve'));
    if (r != null) {
      items = items.where((e) => !(e.targetType == type && e.targetId == id)).toList();
      notifyListeners();
      return true;
    }
    return false;
  }

  /// `POST /admin/review/:type/:id/reject`.
  Future<bool> reject(String type, String id, {String? reason}) async {
    final r = await guard(() async => api.post('/admin/review/$type/$id/reject',
        data: {if (reason != null && reason.isNotEmpty) 'reason': reason}));
    if (r != null) {
      items = items.where((e) => !(e.targetType == type && e.targetId == id)).toList();
      notifyListeners();
      return true;
    }
    return false;
  }

  /// `POST /admin/takedown` — pull an already-approved item down.
  Future<bool> takedown(String type, String id, {String? reason}) async {
    final r = await guard(() => api.post('/admin/takedown', data: {
          'target_type': type,
          'target_id': id,
          if (reason != null && reason.isNotEmpty) 'reason': reason,
        }));
    return r != null;
  }

  /// `GET /admin/moderation-history/:type/:id` — newest-first audit timeline.
  Future<List<ModerationAction>> loadHistory(TargetType type, String id) async {
    final wire = targetTypeToWire(type);
    try {
      final json = await api.getList('/admin/moderation-history/$wire/$id');
      return Page.list(json, ModerationAction.fromJson).items;
    } catch (_) {
      return const [];
    }
  }
}
