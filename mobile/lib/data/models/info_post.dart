import '../remote/json_utils.dart';
import 'enums.dart';

enum InfoCategory { internal, open, recruitment }

enum InfoSource { official, user }

class InfoPost {
  final String id;
  final String title;
  final String content;
  final InfoCategory category;
  final InfoSource source;
  final String authorId;
  final String authorName;
  final String? authorAvatarUrl;
  final ContentVisibility visibility;
  final ContentStatus status;
  final bool pinned;
  final String? rejectReason;
  final List<String> imageIds;
  final List<String> attachmentIds;
  final int version;
  final DateTime createdAt;

  InfoPost({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    required this.source,
    required this.authorId,
    required this.authorName,
    this.authorAvatarUrl,
    required this.visibility,
    this.status = ContentStatus.pending,
    this.pinned = false,
    this.rejectReason,
    this.imageIds = const [],
    this.attachmentIds = const [],
    this.version = 0,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  InfoPost copyWith({
    String? id,
    String? title,
    String? content,
    InfoCategory? category,
    InfoSource? source,
    String? authorId,
    String? authorName,
    String? authorAvatarUrl,
    ContentVisibility? visibility,
    ContentStatus? status,
    bool? pinned,
    String? rejectReason,
    List<String>? imageIds,
    List<String>? attachmentIds,
    int? version,
    DateTime? createdAt,
  }) {
    return InfoPost(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      category: category ?? this.category,
      source: source ?? this.source,
      authorId: authorId ?? this.authorId,
      authorName: authorName ?? this.authorName,
      authorAvatarUrl: authorAvatarUrl ?? this.authorAvatarUrl,
      visibility: visibility ?? this.visibility,
      status: status ?? this.status,
      pinned: pinned ?? this.pinned,
      rejectReason: rejectReason ?? this.rejectReason,
      imageIds: imageIds ?? this.imageIds,
      attachmentIds: attachmentIds ?? this.attachmentIds,
      version: version ?? this.version,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// `GET /infos*` row (BACKEND.md §6.4). `content` is present only on the
  /// detail view; the feed omits it. Author is a nested `{id,name,role}`.
  factory InfoPost.fromJson(Map<String, dynamic> j) {
    final author = (j['author'] as Map?)?.cast<String, dynamic>();
    final department = (j['department'] as Map?)?.cast<String, dynamic>();
    return InfoPost(
      id: asId(j['id']),
      title: asString(j['title']),
      content: asString(j['content']),
      category: enumFromWire(InfoCategory.values, j['category'], fallback: InfoCategory.open),
      source: enumFromWire(InfoSource.values, j['source'], fallback: InfoSource.user),
      authorId: asId(author?['id'] ?? j['author_id']),
      authorName: asString(author?['name']),
      authorAvatarUrl: asStringOrNull(author?['avatar_url']),
      visibility: enumFromWire(ContentVisibility.values, j['visibility'], fallback: ContentVisibility.all),
      status: enumFromWire(ContentStatus.values, j['status'], fallback: ContentStatus.pending),
      pinned: asBool(j['pinned']),
      rejectReason: asStringOrNull(j['reject_reason']),
      version: asVersion(j['version']),
      createdAt: asDate(j['created_at']),
    ).._departmentName = asString(department?['name_zh']);
  }

  /// The author-facing department label, when the row carried the nested
  /// `department` object (not part of the constructor to stay mock-compatible).
  String _departmentName = '';
  String get departmentName => _departmentName;

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'category': enumToWire(category),
        'source': enumToWire(source),
        'visibility': enumToWire(visibility),
        'status': enumToWire(status),
        'pinned': pinned,
        'author_id': authorId,
        'reject_reason': rejectReason,
        'version': version,
        'created_at': createdAt.toIso8601String(),
      };
}
