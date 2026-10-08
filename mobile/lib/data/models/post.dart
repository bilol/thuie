import '../remote/json_utils.dart';
import 'enums.dart';

/// One entry of a post's `liked_by` stack (the up-to-3 most recent likers the
/// detail endpoint embeds for the avatar row). Mirrors the backend `UserBrief`.
class PostLiker {
  final String id;
  final String name;
  final String? avatarUrl;
  const PostLiker({required this.id, required this.name, this.avatarUrl});

  factory PostLiker.fromJson(Map<String, dynamic> j) => PostLiker(
        id: asId(j['id']),
        name: asString(j['name']),
        avatarUrl: asStringOrNull(j['avatar_url']),
      );
}

class Post {
  final String id;
  final String title;
  final String content;
  final String authorId;
  final String authorName;
  final Role authorRole;
  final String? authorAvatarUrl;
  final List<String> tags;
  final ContentStatus status;
  final Set<String> likeUserIds;
  final int likeCount;
  final String? rejectReason;
  final List<String> imageIds;
  final String? location;
  final bool isPinned;
  final int viewCount;
  final int bookmarkCount;
  final int commentCount;
  final int version;
  final DateTime? lastCommentAt;
  final DateTime createdAt;

  /// Per-viewer engagement, now returned on every row (feed + detail + toggle).
  final bool liked;
  final bool bookmarked;
  /// Detail-only: the up-to-3 recent likers backing the avatar stack.
  final List<PostLiker> likedBy;

  Post({
    required this.id,
    required this.title,
    required this.content,
    required this.authorId,
    required this.authorName,
    required this.authorRole,
    this.authorAvatarUrl,
    this.tags = const [],
    this.status = ContentStatus.pending,
    Set<String>? likeUserIds,
    this.likeCount = 0,
    this.rejectReason,
    this.imageIds = const [],
    this.location,
    this.isPinned = false,
    this.viewCount = 0,
    this.bookmarkCount = 0,
    this.commentCount = 0,
    this.version = 0,
    this.lastCommentAt,
    this.liked = false,
    this.bookmarked = false,
    this.likedBy = const [],
    DateTime? createdAt,
  })  : likeUserIds = likeUserIds ?? {},
        createdAt = createdAt ?? DateTime.now();

  Post copyWith({
    String? id,
    String? title,
    String? content,
    String? authorId,
    String? authorName,
    Role? authorRole,
    String? authorAvatarUrl,
    List<String>? tags,
    ContentStatus? status,
    Set<String>? likeUserIds,
    int? likeCount,
    String? rejectReason,
    bool clearRejectReason = false,
    List<String>? imageIds,
    String? location,
    bool? isPinned,
    int? viewCount,
    int? bookmarkCount,
    int? commentCount,
    int? version,
    DateTime? lastCommentAt,
    bool? liked,
    bool? bookmarked,
    List<PostLiker>? likedBy,
    DateTime? createdAt,
  }) {
    return Post(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      authorId: authorId ?? this.authorId,
      authorName: authorName ?? this.authorName,
      authorRole: authorRole ?? this.authorRole,
      authorAvatarUrl: authorAvatarUrl ?? this.authorAvatarUrl,
      tags: tags ?? this.tags,
      status: status ?? this.status,
      likeUserIds: likeUserIds ?? this.likeUserIds,
      likeCount: likeCount ?? this.likeCount,
      rejectReason: clearRejectReason ? null : (rejectReason ?? this.rejectReason),
      imageIds: imageIds ?? this.imageIds,
      location: location ?? this.location,
      isPinned: isPinned ?? this.isPinned,
      viewCount: viewCount ?? this.viewCount,
      bookmarkCount: bookmarkCount ?? this.bookmarkCount,
      commentCount: commentCount ?? this.commentCount,
      version: version ?? this.version,
      lastCommentAt: lastCommentAt ?? this.lastCommentAt,
      liked: liked ?? this.liked,
      bookmarked: bookmarked ?? this.bookmarked,
      likedBy: likedBy ?? this.likedBy,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /posts*` row (BACKEND.md §6.7). Feeds carry `excerpt`; the detail
  /// view adds `content` + `tags`. Every row now embeds the viewer's own
  /// `liked`/`bookmarked` flags (and, on the detail, the `liked_by` avatar
  /// stack), so engagement state is read straight from the server — no local
  /// membership set is needed and it survives a reload.
  factory Post.fromJson(Map<String, dynamic> j) {
    final author = (j['author'] as Map?)?.cast<String, dynamic>();
    final rawTags = j['tags'];
    return Post(
      id: asId(j['id']),
      title: asString(j['title']),
      content: asString(j['content'] ?? j['excerpt']),
      authorId: asId(author?['id'] ?? j['author_id']),
      authorName: asString(author?['name']),
      authorRole: enumFromWire(Role.values, author?['role'] ?? j['author_role'], fallback: Role.student),
      authorAvatarUrl: asStringOrNull(author?['avatar_url']),
      tags: rawTags is List
          ? rawTags
              .map((t) => t is Map ? asString(t['name']) : t.toString())
              .where((s) => s.isNotEmpty)
              .toList()
          : const [],
      status: enumFromWire(ContentStatus.values, j['status'], fallback: ContentStatus.approved),
      likeCount: asInt(j['like_count']),
      rejectReason: asStringOrNull(j['reject_reason']),
      location: asStringOrNull(j['location']),
      isPinned: asBool(j['is_pinned']),
      viewCount: asInt(j['view_count']),
      bookmarkCount: asInt(j['bookmark_count']),
      commentCount: asInt(j['comment_count']),
      version: asVersion(j['version']),
      lastCommentAt: asDateOrNull(j['last_comment_at']),
      liked: asBool(j['liked']),
      bookmarked: asBool(j['bookmarked']),
      likedBy: (j['liked_by'] as List?)
              ?.whereType<Map>()
              .map((e) => PostLiker.fromJson(e.cast<String, dynamic>()))
              .toList() ??
          const [],
      createdAt: asDate(j['created_at']),
    );
  }

  /// Like total reported by the server (the per-viewer set below only
  /// tracks whether *this* device has liked, not the community count).
  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'author_id': authorId,
        'tags': tags,
        'status': enumToWire(status),
        'like_count': likeCount,
        'location': location,
        'is_pinned': isPinned,
        'view_count': viewCount,
        'bookmark_count': bookmarkCount,
        'comment_count': commentCount,
        'version': version,
        'created_at': createdAt.toIso8601String(),
      };
}
