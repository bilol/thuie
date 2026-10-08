import '../remote/json_utils.dart';
import 'enums.dart';

class Comment {
  final String id;
  final String postId;
  final String authorId;
  final String authorName;
  final Role authorRole;
  final String? authorAvatarUrl;
  final String content;
  final String? parentId;
  final String? rootId;
  final ContentStatus status;
  final int version;
  final DateTime createdAt;

  /// Threaded replies (only populated on `GET /posts/:id/comments` roots).
  List<Comment> replies;

  Comment({
    required this.id,
    required this.postId,
    required this.authorId,
    required this.authorName,
    required this.authorRole,
    required this.content,
    this.authorAvatarUrl,
    this.parentId,
    this.rootId,
    this.status = ContentStatus.approved,
    this.version = 0,
    this.replies = const [],
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Comment copyWith({
    String? id,
    String? postId,
    String? authorId,
    String? authorName,
    Role? authorRole,
    String? authorAvatarUrl,
    String? content,
    String? parentId,
    ContentStatus? status,
    int? version,
    DateTime? createdAt,
  }) {
    return Comment(
      id: id ?? this.id,
      postId: postId ?? this.postId,
      authorId: authorId ?? this.authorId,
      authorName: authorName ?? this.authorName,
      authorRole: authorRole ?? this.authorRole,
      authorAvatarUrl: authorAvatarUrl ?? this.authorAvatarUrl,
      content: content ?? this.content,
      parentId: parentId ?? this.parentId,
      status: status ?? this.status,
      version: version ?? this.version,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /posts/:id/comments` / comment rows (§6.8). Author is nested.
  factory Comment.fromJson(Map<String, dynamic> j) {
    final author = (j['author'] as Map?)?.cast<String, dynamic>();
    return Comment(
      id: asId(j['id']),
      postId: asId(j['forum_post_id'] ?? j['post_id']),
      authorId: asId(author?['id'] ?? j['author_id']),
      authorName: asString(author?['name']),
      authorRole: enumFromWire(Role.values, author?['role'] ?? j['author_role'], fallback: Role.student),
      authorAvatarUrl: asStringOrNull(author?['avatar_url']),
      content: asString(j['content']),
      parentId: asIdOrNull(j['parent_id']),
      rootId: asIdOrNull(j['root_id']),
      status: enumFromWire(ContentStatus.values, j['status'], fallback: ContentStatus.approved),
      version: asVersion(j['version']),
      replies: (j['replies'] as List?)
              ?.whereType<Map>()
              .map((e) => Comment.fromJson(e.cast<String, dynamic>()))
              .toList() ??
          const [],
      createdAt: asDate(j['created_at']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'forum_post_id': postId,
        'parent_id': parentId,
        'root_id': rootId,
        'content': content,
        'status': enumToWire(status),
        'version': version,
        'author_id': authorId,
        'created_at': createdAt.toIso8601String(),
      };
}
