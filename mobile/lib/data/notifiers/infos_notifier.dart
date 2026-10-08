import '../models.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// `GET/POST/PATCH/DELETE /infos` (§6.4). The server applies visibility +
/// moderation, so the feed already holds only what the viewer may see — the old
/// client-side `visibleInfos` role filter and `checkKeywords` are gone.
class InfosNotifier extends PaginatedNotifier<InfoPost> {
  InfosNotifier({super.api});

  @override
  String get resourcePath => '/infos';

  /// Wire `category` filter (`internal`/`open`/`recruitment`), null = all.
  String? category;

  /// Wire `source` filter (`official`/`user`), null = all. The home screen no
  /// longer surfaces official notices separately, so the Info list filters here.
  String? source;

  /// Free-text keyword search (`title`/`content` ILIKE), null/empty = all.
  String? q;

  @override
  Map<String, dynamic> get baseQuery => {
        if (category != null) 'category': category,
        if (source != null) 'source': source,
        if (q != null && q!.isNotEmpty) 'q': q,
        'sort': 'latest',
      };

  @override
  Page<InfoPost> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, InfoPost.fromJson);

  InfoPost? byId(String id) {
    for (final i in items) {
      if (i.id == id) return i;
    }
    return null;
  }

  /// Sets the active [category] filter and re-pulls page one.
  Future<void> setCategory(String? value) async {
    if (category == value) return;
    category = value;
    await reload();
  }

  /// Toggles the official-only filter: [official] true → `source=official`,
  /// false clears it. Orthogonal to [category], so both can combine.
  Future<void> setOfficialOnly(bool official) async {
    final next = official ? 'official' : null;
    if (source == next) return;
    source = next;
    await reload();
  }

  /// Sets the server keyword search and re-pulls page one.
  Future<void> setQuery(String? value) async {
    final next = (value == null || value.isEmpty) ? null : value;
    if (q == next) return;
    q = next;
    await reload();
  }

  /// `POST /infos`. Returns the created row (pending review) or null on error.
  Future<InfoPost?> create({
    required String title,
    required String content,
    required InfoCategory category,
    ContentVisibility visibility = ContentVisibility.all,
    String? department,
    bool pinned = false,
  }) {
    return guard<InfoPost>(() async {
      final json = await api.post('/infos', data: {
        'title': title,
        'content': content,
        'category': enumToWire(category),
        'visibility': enumToWire(visibility),
        if (department != null) 'department': department,
        if (pinned) 'pinned': pinned,
      });
      final created = InfoPost.fromJson(unwrapObject(json));
      items = [created, ...items];
      notifyListeners();
      return created;
    });
  }

  /// Author edit — sends `version` for the optimistic lock; on `412` the caller
  /// re-fetches. Returns the updated row, or null on conflict/error.
  Future<InfoPost?> update(
    String id, {
    String? title,
    String? content,
    InfoCategory? category,
    ContentVisibility? visibility,
    required int version,
  }) {
    return guard<InfoPost>(() async {
      final json = await api.patch('/infos/$id', data: {
        if (title != null) 'title': title,
        if (content != null) 'content': content,
        if (category != null) 'category': enumToWire(category),
        if (visibility != null) 'visibility': enumToWire(visibility),
        'version': version,
      });
      final updated = InfoPost.fromJson(unwrapObject(json));
      upsert(updated, (o) => o.id == id);
      return updated;
    });
  }

  /// Author takedown (`DELETE /infos/:id`).
  Future<bool> takeDown(String id) async {
    final r = await guard(() => api.delete('/infos/$id'));
    if (r != null) {
      removeWhere((o) => o.id == id);
      return true;
    }
    return false;
  }

  /// `POST /infos/:id/report` — convenience alias for a fixed info target.
  Future<bool> report(String id, String reason) async {
    final r = await guard(() => api.post('/infos/$id/report', data: {'reason': reason}));
    return r != null;
  }

  /// Detail fetch including `content` (the feed omits it).
  Future<InfoPost?> loadDetail(String id) => fetchOne(id);
}
