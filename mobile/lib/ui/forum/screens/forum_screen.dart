import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class ForumScreen extends StatefulWidget {
  const ForumScreen({super.key});

  @override
  State<ForumScreen> createState() => _ForumScreenState();
}

class _ForumScreenState extends State<ForumScreen> {
  String _query = '';
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final notifier = context.read<ForumNotifier>();
      notifier.load();
      notifier.loadTags();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  // Server-backed, debounced search — a client `.contains` over the loaded page
  // would miss everything not yet pulled and read as "search doesn't work".
  void _onQueryChanged(String value) {
    setState(() => _query = value);
    _debounce?.cancel();
    final notifier = context.read<ForumNotifier>();
    _debounce = Timer(const Duration(milliseconds: 350), () => notifier.setQuery(value.trim()));
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<ForumNotifier>();
    final session = context.watch<AuthSession>();
    final c = ThuieTheme.colorsOf(context);
    final canPost = session.roleStrategy?.canPostForum ?? false;

    // Server owns visibility + moderation + the search/tag filter.
    final posts = notifier.items;

    final body = Column(children: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(children: [
          Expanded(child: FlatField(
            value: _query, onChanged: _onQueryChanged,
            placeholder: L10n.searchPostPlaceholder, leadingIcon: const Icon(LucideIcons.search, size: 16),
            trailingIcon: _query.isEmpty ? null : const Icon(LucideIcons.x, size: 16),
            onTrailingTap: () => _onQueryChanged(''),
          )),
          const SizedBox(width: 8),
          ThuieIconButton(icon: LucideIcons.arrowUpDown, size: 20, tooltip: L10n.sortMethod, onTap: () => _showSort(context)),
          if (notifier.tags.isNotEmpty) ...[
            const SizedBox(width: 4),
            ThuieIconButton(icon: LucideIcons.slidersHorizontal, size: 20, tooltip: L10n.tagFilter, onTap: () => _showFilter(context)),
          ],
        ]),
      ),
      if (notifier.tag != null)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            TagChip(text: notifier.tag!, onTap: () => notifier.setTag(null)),
            const SizedBox(width: 6),
            GestureDetector(onTap: () => notifier.setTag(null),
              child: Text(L10n.clearFilter, style: TextStyle(fontSize: 12, color: c.muted))),
          ]),
        ),
      Expanded(child: _body(notifier, posts, c)),
    ]);

    if (!canPost) return body;
    return Stack(children: [
      body,
      Positioned(
        right: 16, bottom: 16,
        child: FloatingActionButton(
          heroTag: 'postCreate',
          tooltip: L10n.createPost,
          onPressed: () => Navigator.of(context).pushNamed(Routes.postCreate),
          child: const Icon(LucideIcons.plus),
        ),
      ),
    ]);
  }

  Widget _body(ForumNotifier notifier, List<Post> posts, ThuieColors c) {
    Widget content;
    switch (notifier.status) {
      case AsyncStatus.idle:
      case AsyncStatus.loading:
        if (notifier.items.isNotEmpty) break;
        return const Center(child: ThuieLoader());
      case AsyncStatus.error:
        content = ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          message: notifier.error != null ? L10n.describeApiError((notifier.error as ApiError).code) : null,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        );
        return content;
      case AsyncStatus.ready:
        break;
    }
    if (posts.isEmpty) {
      content = EmptyState(
        text: _query.isNotEmpty ? L10n.searchNoResults(_query) : L10n.noDiscussionsYet,
        icon: LucideIcons.messagesSquare,
      );
    } else {
      content = PagedListView(
        items: posts,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 88),
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        onLoadMore: notifier.loadMore,
        hasMore: notifier.hasMore,
        isLoadingMore: notifier.loadingMore,
        itemBuilder: (_, post) => _PostCard(post: post, liked: notifier.liked(post.id), onTap: () => Navigator.of(context).pushNamed(Routes.postDetail, arguments: post.id)),
      );
    }
    return RefreshIndicator(onRefresh: () => notifier.load(refresh: true), child: content);
  }

  void _showSort(BuildContext context) {
    final notifier = context.read<ForumNotifier>();
    showThuieBottomSheet(context, builder: (_) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          SectionLabel(L10n.sortMethod),
          const SizedBox(height: 10),
          // Picking a sort applies it and closes the sheet — the change is
          // immediate, so there is no separate "Done" apply step.
          SelectTabs(
            options: [L10n.newest, L10n.hottest],
            selectedIndex: notifier.sort == 'hot' ? 1 : 0,
            onSelect: (i) { notifier.setSort(i == 1 ? 'hot' : 'latest'); Navigator.of(context).pop(); },
          ),
        ]),
      );
    });
  }

  void _showFilter(BuildContext context) {
    final notifier = context.read<ForumNotifier>();
    final tags = notifier.tags.map((t) => t.name).toList();
    if (tags.isEmpty) return;
    showThuieBottomSheet(context, builder: (_) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          SectionLabel(L10n.tagFilter),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            // Picking a tag applies it and closes the sheet — the change is
            // immediate, so there is no separate "Done" apply step.
            TagChip(text: L10n.allLabel, onTap: () { notifier.setTag(null); Navigator.of(context).pop(); }),
            for (final tag in tags)
              TagChip(text: tag, onTap: () { notifier.setTag(tag); Navigator.of(context).pop(); }),
          ]),
        ]),
      );
    });
  }
}

class _PostCard extends StatelessWidget {
  final Post post;
  final bool liked;
  final VoidCallback onTap;
  const _PostCard({required this.post, required this.liked, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return InfoCard(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Avatar(name: post.authorName, seed: post.authorId.hashCode, size: 36, imagePath: post.authorAvatarUrl),
          const SizedBox(width: 10),
          Expanded(child: Row(children: [
            Flexible(child: Text(post.authorName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), overflow: TextOverflow.ellipsis)),
            const SizedBox(width: 6),
            RoleBadge(post.authorRole),
          ])),
        ]),
        const SizedBox(height: 10),
        Text(post.title, style: c.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 4),
        Text(post.content, style: TextStyle(fontSize: 13, color: c.muted), maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 6),
        MetaText(Fmt.relative(post.createdAt)),
        if (post.tags.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 4, children: post.tags.map((t) => TagChip(text: t)).toList()),
        ],
        const SizedBox(height: 6),
        Row(children: [
          Icon(LucideIcons.thumbsUp, size: 14, color: liked ? c.accent : c.muted),
          const SizedBox(width: 4),
          Text('${post.likeCount}', style: TextStyle(fontSize: 12, color: liked ? c.accent : c.muted)),
          const SizedBox(width: 14),
          Icon(LucideIcons.messageCircle, size: 14, color: c.muted),
          const SizedBox(width: 4),
          Text('${post.commentCount}', style: TextStyle(fontSize: 12, color: c.muted)),
        ]),
      ]),
    );
  }
}
