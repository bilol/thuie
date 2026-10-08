import '../models.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// `GET/POST/DELETE /favorites` (§6.12). The polymorphic
/// `(target_type, target_id)` key spans infos / posts / profiles / comments.
class FavoritesNotifier extends PaginatedNotifier<Favorite> {
  @override
  String get resourcePath => '/favorites';

  /// Optional target-type filter (`info`/`post`/`profile`/`comment`), null = all.
  TargetType? filter;

  @override
  Map<String, dynamic> get baseQuery => {
        if (filter != null) 'type': enumToWire(filter!),
      };

  @override
  Page<Favorite> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, Favorite.fromJson);

  Future<void> setFilter(TargetType? value) async {
    if (filter == value) return;
    filter = value;
    await reload();
  }

  bool isBookmarked(TargetType type, String targetId) => items.any(
        (f) => f.targetType == type && f.targetId == targetId,
      );

  /// Idempotent add — the server upserts on the composite PK.
  Future<void> add(TargetType type, String targetId) async {
    final r = await guard(() =>
        api.post('/favorites', data: {'target_type': enumToWire(type), 'target_id': targetId}));
    if (r != null && !isBookmarked(type, targetId)) {
      items = [Favorite('', type, targetId), ...items];
      notifyListeners();
    }
  }

  Future<void> remove(TargetType type, String targetId) async {
    final r = await guard(() =>
        api.delete('/favorites/${enumToWire(type)}/$targetId'));
    if (r != null) {
      removeWhere((f) => f.targetType == type && f.targetId == targetId);
    }
  }

  Future<void> toggle(TargetType type, String targetId) =>
      isBookmarked(type, targetId) ? remove(type, targetId) : add(type, targetId);
}
