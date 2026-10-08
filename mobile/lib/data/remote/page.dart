import 'json_utils.dart';

/// A page of list results plus the two pagination strategies (§4):
///   * cursor/keyset  → `nextCursor` (append-mostly feeds: infos, posts, chat,
///     notifications, history) — `hasMore` is `nextCursor != null`.
///   * offset         → `page`/`total`/`totalPages` (low-volume admin queues).
///
/// The wire envelope is `{ data: [...], meta: { ... } }`. `data` items use
/// snake_case; `meta` keys are camelCase (`nextCursor`), matching the server's
/// `cursorPage`/`offsetPage` helpers.
class Page<T> {
  final List<T> items;
  final int limit;

  /// Cursor envelope: opaque next-page cursor, null at end of collection.
  final String? nextCursor;

  /// Offset envelope fields (null for cursor pages).
  final int? page;
  final int? total;
  final int? totalPages;

  const Page({
    required this.items,
    this.limit = 20,
    this.nextCursor,
    this.page,
    this.total,
    this.totalPages,
  });

  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;

  /// Cursor feeds: there is more when the server returned a nextCursor.
  bool get hasMore => nextCursor != null;

  /// Offset feeds: there is more when the current page is short of totalPages.
  bool get hasMorePages {
    if (page == null || totalPages == null) return false;
    return page! < totalPages!;
  }

  static Page<T> emptyCursor<T>({int limit = 20}) =>
      Page<T>(items: const [], limit: limit, nextCursor: null);

  /// Decode `{data, meta:{nextCursor, limit, total_estimate?}}`.
  factory Page.cursor(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) mapper,
  ) {
    final data = (json['data'] as List?) ?? const [];
    final meta = (json['meta'] as Map?)?.cast<String, dynamic>() ?? const {};
    return Page<T>(
      items: data.whereType<Map>().map((e) => mapper(e.cast<String, dynamic>())).toList(),
      limit: asInt(meta['limit'], orElse: 20),
      nextCursor: asStringOrNull(meta['nextCursor']),
    );
  }

  /// Decode `{data, meta:{page, limit, total, totalPages}}`.
  factory Page.offset(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) mapper,
  ) {
    final data = (json['data'] as List?) ?? const [];
    final meta = (json['meta'] as Map?)?.cast<String, dynamic>() ?? const {};
    return Page<T>(
      items: data.whereType<Map>().map((e) => mapper(e.cast<String, dynamic>())).toList(),
      limit: asInt(meta['limit'], orElse: 20),
      page: asIntOrNull(meta['page']),
      total: asIntOrNull(meta['total']),
      totalPages: asIntOrNull(meta['totalPages']),
    );
  }

  /// For responses that are a bare JSON array (no envelope), e.g. some
  /// non-paginated lists (`/tags`, `/me/notification-preferences`).
  factory Page.list(List<dynamic> raw, T Function(Map<String, dynamic>) mapper) =>
      Page<T>(
        items: raw.whereType<Map>().map((e) => mapper(e.cast<String, dynamic>())).toList(),
      );

  Page<T> mergeNext(Page<T> older) => Page<T>(
        items: [...items, ...older.items],
        limit: older.limit,
        nextCursor: older.nextCursor,
        page: older.page,
        total: older.total,
        totalPages: older.totalPages,
      );
}
