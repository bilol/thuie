import '../models.dart';
import '../remote/json_utils.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// A forum tag from `GET /tags` (§6.7 tag dictionary).
typedef ForumTag = ({String id, String name, String slug});

/// `GET/POST/PATCH/DELETE /posts` + the `/posts/:id/comments` thread and the
/// per-viewer `like`/`bookmark` toggles (§6.7). Server owns visibility
/// and the keyword filter, so the compose path no longer pre-scans text.
class ForumNotifier extends PaginatedNotifier<Post> {
  @override
  String get resourcePath => '/posts';

  String? tag;
  String sort = 'latest';

  /// Free-text keyword search (`title`/`content` ILIKE), null/empty = all.
  String? q;

  @override
  Map<String, dynamic> get baseQuery => {
        if (tag != null) 'tag': tag,
        if (q != null && q!.isNotEmpty) 'q': q,
        'sort': sort,
      };

  @override
  Page<Post> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, Post.fromJson);

  // --- per-viewer engagement state, read straight off the server rows ---------
  // The browse feed + detail + every toggle response embed the viewer's own
  // `liked`/`bookmarked` flags, so there is no session-local membership set to
  // drift out of sync — a reload keeps the buttons in the right state.
  bool liked(String id) => byId(id)?.liked ?? false;
  bool bookmarked(String id) => byId(id)?.bookmarked ?? false;

  Post? byId(String id) {
    for (final p in items) {
      if (p.id == id) return p;
    }
    return null;
  }

  /// Make the authoritative detail row visible to [byId]. The browse feed builds
  /// a partial row (`excerpt` only, no `content`/`tags`/`liked_by`), so the detail
  /// screen must upgrade it in place — replacing the feed row when it's already
  /// loaded (so the full body + avatar stack render and toggles/comment-count bumps
  /// land on the same row the card reads) or appending it when opened cold.
  void hydrateDetail(Post? p) {
    if (p == null) return;
    final idx = items.indexWhere((o) => o.id == p.id);
    if (idx == -1) {
      items = [...items, p];
    } else {
      items = [...items]..[idx] = p;
    }
    notifyListeners();
  }

  Future<void> setTag(String? value) async {
    if (tag == value) return;
    tag = value;
    await reload();
  }

  Future<void> setSort(String value) async {
    if (sort == value) return;
    sort = value;
    await reload();
  }

  /// Sets the server keyword search and re-pulls page one.
  Future<void> setQuery(String? value) async {
    final next = (value == null || value.isEmpty) ? null : value;
    if (q == next) return;
    q = next;
    await reload();
  }

  Future<Post?> create({
    required String title,
    required String content,
    String? location,
    List<String> tags = const [],
  }) {
    return guard<Post>(() async {
      final json = await api.post('/posts', data: {
        'title': title,
        'content': content,
        if (location != null && location.isNotEmpty) 'location': location,
        if (tags.isNotEmpty) 'tags': tags,
      });
      final created = Post.fromJson(unwrapObject(json));
      items = [created, ...items];
      notifyListeners();
      return created;
    });
  }

  Future<Post?> update(
    String id, {
    String? title,
    String? content,
    String? location,
    List<String>? tags,
    required int version,
  }) {
    return guard<Post>(() async {
      final json = await api.patch('/posts/$id', data: {
        if (title != null) 'title': title,
        if (content != null) 'content': content,
        if (location != null) 'location': location,
        if (tags != null) 'tags': tags,
        'version': version,
      });
      final updated = Post.fromJson(unwrapObject(json));
      upsert(updated, (o) => o.id == id);
      return updated;
    });
  }

  Future<bool> removePost(String id) async {
    final r = await guard(() => api.delete('/posts/$id'));
    if (r != null) {
      removeWhere((o) => o.id == id);
      return true;
    }
    return false;
  }

  /// Toggles a post engagement counter. The server replies with the fresh post
  /// row (plus the `active`/`count` convenience pair); its `liked`/`bookmarked`
  /// flags and counts already reflect this viewer's toggle, so the row is the
  /// single source we fold back into the list.
  Future<void> _toggle(String id, String verb) async {
    final result = await guard(() => api.post('/posts/$id/$verb'));
    if (result == null) return;
    upsert(Post.fromJson(result), (o) => o.id == id);
  }

  Future<void> like(String id) => _toggle(id, 'like');
  Future<void> bookmark(String id) => _toggle(id, 'bookmark');

  Future<bool> reportPost(String id, String reason) async {
    final r = await guard(() => api.post('/posts/$id/report', data: {'reason': reason}));
    return r != null;
  }

  // --------------------------------------------------------------- comments ----

  final Map<String, List<Comment>> _comments = {};

  /// Roots + nested replies for a post (server returns `{data:[root…with replies]}`).
  List<Comment> commentsFor(String postId) => _comments[postId] ?? const [];

  Future<List<Comment>> loadComments(String postId) async {
    final result = await guard(() => api.get('/posts/$postId/comments'));
    if (result == null) return const [];
    final data = (result['data'] as List?) ?? const [];
    final list = data
        .whereType<Map>()
        .map((e) => Comment.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    _comments[postId] = list;
    notifyListeners();
    return list;
  }

  Future<Comment?> addComment(String postId, String content, {String? parentId}) async {
    final result = await guard(() => api.post('/posts/$postId/comments', data: {
          'content': content,
          if (parentId != null) 'parent_id': parentId,
        }));
    if (result == null) return null;
    final created = Comment.fromJson(result);
    await loadComments(postId);
    final current = byId(postId);
    if (current != null) {
      upsert(current.copyWith(commentCount: current.commentCount + 1),
          (o) => o.id == postId);
    }
    return created;
  }

  Future<bool> editComment(String postId, String commentId, String content, int version) async {
    final r = await guard(() =>
        api.patch('/comments/$commentId', data: {'content': content, 'version': version}));
    if (r != null) await loadComments(postId);
    return r != null;
  }

  Future<bool> deleteComment(String postId, String commentId) async {
    final r = await guard(() => api.delete('/comments/$commentId'));
    if (r != null) await loadComments(postId);
    return r != null;
  }

  Future<bool> reportComment(String commentId, String reason) async {
    final r = await guard(() => api.post('/comments/$commentId/report', data: {'reason': reason}));
    return r != null;
  }

  // ------------------------------------------------------------------ tags ----

  List<ForumTag> _tags = const [];
  List<ForumTag> get tags => _tags;

  Future<List<ForumTag>> loadTags() async {
    final result = await guard(() => api.get('/tags'));
    if (result == null) return const [];
    final data = (result['data'] as List?) ?? const [];
    _tags = data.whereType<Map>().map((e) {
      final m = Map<String, dynamic>.from(e);
      return (id: asId(m['id']), name: asString(m['name']), slug: asString(m['slug']));
    }).toList();
    notifyListeners();
    return _tags;
  }
}
