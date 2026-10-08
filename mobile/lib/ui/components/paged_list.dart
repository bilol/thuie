import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/thuie_theme.dart';
import 'feedback.dart';

/// Feed list used across the info / forum / alumni / notification surfaces.
///
/// Two modes:
///   * **client paging** (legacy, mock): pass only [items] — it reveals more in
///     [pageSize] chunks as the user scrolls.
///   * **server cursor paging**: pass [onLoadMore] + [hasMore] (and optionally
///     [isLoadingMore]). It renders every loaded item and calls [onLoadMore]
///     when the user nears the bottom; the footer reflects the extra page state.
class PagedListView<T> extends StatefulWidget {
  final List<T> items;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final IndexedWidgetBuilder? separatorBuilder;
  final int pageSize;
  final EdgeInsetsGeometry? padding;

  /// Server-driven hooks (null ⇒ legacy client paging).
  final Future<void> Function()? onLoadMore;
  final bool hasMore;
  final bool isLoadingMore;

  const PagedListView({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.separatorBuilder,
    this.pageSize = 20,
    this.padding,
    this.onLoadMore,
    this.hasMore = false,
    this.isLoadingMore = false,
  });

  bool get serverDriven => onLoadMore != null;

  @override
  State<PagedListView<T>> createState() => _PagedListViewState<T>();
}

class _PagedListViewState<T> extends State<PagedListView<T>> {
  late final ScrollController _scroll = ScrollController();
  late int _shown = _clamp(widget.pageSize);
  bool _loadingMore = false;

  int _clamp(int n) => n > widget.items.length ? widget.items.length : n;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void didUpdateWidget(PagedListView<T> old) {
    super.didUpdateWidget(old);
    if (!widget.serverDriven) {
      if (old.items.length != widget.items.length) {
        setState(() => _shown = _clamp(widget.pageSize));
      } else if (_shown > widget.items.length) {
        setState(() => _shown = widget.items.length);
      }
    }
  }

  @override
  void dispose() {
    _scroll
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels < _scroll.position.maxScrollExtent - 240) return;
    if (widget.serverDriven) {
      if (widget.hasMore && !widget.isLoadingMore) widget.onLoadMore!();
      return;
    }
    if (_loadingMore || _shown >= widget.items.length) return;
    _loadMore();
  }

  Future<void> _loadMore() async {
    setState(() => _loadingMore = true);
    // Brief delay so the footer spinner is visible, mimicking a page fetch.
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (!mounted) return;
    setState(() {
      _shown = _clamp(_shown + widget.pageSize);
      _loadingMore = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final sep = widget.separatorBuilder ?? (_, __) => const SizedBox.shrink();

    if (widget.serverDriven) {
      final showFooter = widget.hasMore || widget.isLoadingMore;
      final itemCount = widget.items.length + (showFooter ? 1 : 0);
      return ListView.separated(
        controller: _scroll,
        padding: widget.padding,
        itemCount: itemCount,
        separatorBuilder: (_, i) => i < widget.items.length ? sep(context, i) : const SizedBox.shrink(),
        itemBuilder: (context, i) {
          if (i < widget.items.length) return widget.itemBuilder(context, widget.items[i]);
          return SizedBox(
            height: 48,
            child: Center(
              child: widget.isLoadingMore
                  ? const ThuieLoader(size: 20)
                  : Icon(LucideIcons.chevronDown, size: 18, color: c.muted),
            ),
          );
        },
      );
    }

    final hasMore = _shown < widget.items.length;
    final itemCount = _shown + (hasMore ? 1 : 0);
    return ListView.separated(
      controller: _scroll,
      padding: widget.padding,
      itemCount: itemCount,
      separatorBuilder: (_, i) => i < _shown ? sep(context, i) : const SizedBox.shrink(),
      itemBuilder: (context, i) {
        if (i < _shown) return widget.itemBuilder(context, widget.items[i]);
        return SizedBox(
          height: 48,
          child: Center(
            child: _loadingMore
                ? const ThuieLoader(size: 20)
                : Icon(LucideIcons.chevronDown, size: 18, color: c.muted),
          ),
        );
      },
    );
  }
}
