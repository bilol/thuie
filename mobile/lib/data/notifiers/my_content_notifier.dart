import '../models.dart';
import '../remote/page.dart';
import 'paginated_notifier.dart';

/// Author-scoped "my content" lists. Unlike the public feeds — which the server
/// trims to approved-only — `/me/infos` and `/me/posts` also return the viewer's
/// own pending/rejected rows, so the submissions screens can show review state
/// and the reject reason. `GET /me/comments` lists the viewer's own comments.

/// `GET /me/infos` (§6.4) — the viewer's own info submissions, cursor page.
class MyInfosNotifier extends PaginatedNotifier<InfoPost> {
  MyInfosNotifier({super.api});

  @override
  String get resourcePath => '/me/infos';

  /// Wire status filter: `pending` / `approved` / `rejected`; null = all.
  /// Named `statusFilter` because [PaginatedNotifier.status] is the load state.
  String? statusFilter;

  @override
  Map<String, dynamic> get baseQuery => {if (statusFilter != null) 'status': statusFilter};

  @override
  Page<InfoPost> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, InfoPost.fromJson);

  /// Sets the active status tab and re-pulls page one.
  Future<void> setStatus(String? value) async {
    if (statusFilter == value) return;
    statusFilter = value;
    await reload();
  }
}

/// `GET /me/posts` (§6.7) — the viewer's own forum posts, cursor page.
class MyPostsNotifier extends PaginatedNotifier<Post> {
  MyPostsNotifier({super.api});

  @override
  String get resourcePath => '/me/posts';

  String? statusFilter;

  @override
  Map<String, dynamic> get baseQuery => {if (statusFilter != null) 'status': statusFilter};

  @override
  Page<Post> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, Post.fromJson);

  Future<void> setStatus(String? value) async {
    if (statusFilter == value) return;
    statusFilter = value;
    await reload();
  }
}

/// `GET /me/comments` (§6.8) — the viewer's own comments, cursor page. No
/// server-side status filter, so all review states come back in one list.
class MyCommentsNotifier extends PaginatedNotifier<Comment> {
  MyCommentsNotifier({super.api});

  @override
  String get resourcePath => '/me/comments';

  @override
  Map<String, dynamic> get baseQuery => const {};

  @override
  Page<Comment> decodePage(Map<String, dynamic> json) =>
      Page.cursor(json, Comment.fromJson);
}
