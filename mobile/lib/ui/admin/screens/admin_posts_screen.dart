import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_review_notifier.dart';
import '../../../data/notifiers/admin_stats_notifier.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/admin_dialogs.dart';

/// §6.17 forum moderation console. The pending tab is the review queue
/// (`GET /admin/review?type=forum_post`); the all-posts tab lists every post
/// visible to the admin (`/posts` via [ForumNotifier]) and pulls approved ones
/// down through `POST /admin/takedown`.
///
/// Tab counts are server-backed, never the loaded page length: pending uses the
/// review queue's `total`, all posts uses `GET /admin/stats` → `totalPosts`.
class AdminPostsScreen extends StatefulWidget {
  const AdminPostsScreen({super.key});
  @override
  State<AdminPostsScreen> createState() => _AdminPostsScreenState();
}

class _AdminPostsScreenState extends State<AdminPostsScreen> {
  final _notifier = AdminReviewNotifier(typeFilter: 'forum_post');
  final _stats = AdminStatsNotifier();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _notifier.load();
      _stats.load();
      context.read<ForumNotifier>().load();
    });
  }

  @override
  void dispose() {
    _notifier.dispose();
    _stats.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AdminReviewNotifier>.value(
      value: _notifier,
      child: ChangeNotifierProvider<AdminStatsNotifier>.value(
        value: _stats,
        child: const _AdminPostsBody(),
      ),
    );
  }
}

class _AdminPostsBody extends StatelessWidget {
  const _AdminPostsBody();
  @override
  Widget build(BuildContext context) {
    final review = context.watch<AdminReviewNotifier>();
    final forum = context.watch<ForumNotifier>();
    final stats = context.watch<AdminStatsNotifier>().stats;
    final c = ThuieTheme.colorsOf(context);

    // Real totals: review queue meta total (null until loaded) and the
    // server-authoritative post count — not the capped first-page length.
    final pendingCount = review.total ?? review.items.length;
    final allCount = stats.totalPosts;

    return DefaultTabController(
      length: 2,
      child: ThuiePage(
        bar: ThuieBar(title: L10n.postManagement),
        body: Column(children: [
          Container(
            color: c.surface,
            child: TabBar(
              labelColor: c.accent,
              unselectedLabelColor: c.muted,
              indicatorColor: c.accent,
              indicatorWeight: 2,
              tabs: [
                _AdminTab(label: L10n.pendingReview, count: pendingCount),
                _AdminTab(label: L10n.allPostsTab, count: allCount),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(children: [
              _PendingPostsList(notifier: review),
              _AllPostsList(forum: forum),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _AdminTab extends StatelessWidget {
  final String label;
  final int count;
  const _AdminTab({required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Tab(
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500))),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
          decoration: BoxDecoration(
            color: c.accentWeak,
            borderRadius: BorderRadius.circular(ThuieRadii.lg),
          ),
          child: Text('$count', style: TextStyle(fontSize: 11, color: c.accent, fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }
}

class _PendingPostsList extends StatelessWidget {
  final AdminReviewNotifier notifier;
  const _PendingPostsList({required this.notifier});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);

    final body = switch (notifier.status) {
      AsyncStatus.idle || AsyncStatus.loading => const Center(child: ThuieLoader()),
      AsyncStatus.error => ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          message: notifier.error is ApiError
              ? L10n.describeApiError((notifier.error as ApiError).code)
              : null,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        ),
      AsyncStatus.ready => notifier.items.isEmpty
          ? EmptyState(text: L10n.noPendingPosts)
          : ListView.separated(
              padding: const EdgeInsets.all(ThuieSpace.lg),
              itemCount: notifier.items.length + (notifier.hasMorePages ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                if (i >= notifier.items.length) {
                  return Center(
                    child: TextButton(
                      onPressed: notifier.loadMore,
                      child: Text(L10n.loadMore,
                          style: TextStyle(fontSize: 12, color: c.muted)),
                    ),
                  );
                }
                final item = notifier.items[i];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    border: Border.all(color: c.hairline, width: 0.5),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      RoleBadge(item.authorRole),
                      const Spacer(),
                      MetaText(Fmt.relative(item.submittedAt)),
                    ]),
                    const SizedBox(height: 8),
                    Text(item.title, style: c.titleMedium),
                    const SizedBox(height: 4),
                    MetaText(item.authorName),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(child: ThuieOutlinedButton(label: L10n.reject, onTap: () {
                        showAdminInputDialog(context, onConfirm: (r) {
                          notifier.reject(item.targetType, item.targetId, reason: r);
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reviewRejectedMsg), duration: const Duration(seconds: 1)));
                        });
                      })),
                      const SizedBox(width: 10),
                      Expanded(child: ThuieFilledButton(label: L10n.approve, onTap: () {
                        notifier.approve(item.targetType, item.targetId);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reviewApprovedMsg), duration: const Duration(seconds: 1)));
                      })),
                    ]),
                  ]),
                );
              },
            ),
    };
    return body;
  }
}

class _AllPostsList extends StatelessWidget {
  final ForumNotifier forum;
  const _AllPostsList({required this.forum});

  @override
  Widget build(BuildContext context) {
    final review = context.read<AdminReviewNotifier>();
    final c = ThuieTheme.colorsOf(context);
    final posts = forum.items;

    if (posts.isEmpty) {
      return forum.isReady
          ? EmptyState(text: L10n.noPostsAtAll)
          : const Center(child: ThuieLoader());
    }
    final sorted = [...posts]..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    return ListView.separated(
      padding: const EdgeInsets.all(ThuieSpace.lg),
      itemCount: sorted.length + (forum.hasMore ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) {
        if (i >= sorted.length) {
          return Center(
            child: TextButton(
              onPressed: forum.loadMore,
              child: Text(L10n.loadMore, style: TextStyle(fontSize: 12, color: c.muted)),
            ),
          );
        }
        final post = sorted[i];
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.sm),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(post.title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis)),
                const SizedBox(width: 6),
                StatusBadge(post.status),
              ]),
              const SizedBox(height: 2),
              MetaText('${post.authorName} · ${Fmt.relative(post.createdAt)} · ${post.likeCount} ${L10n.likesSuffix}'),
            ])),
            if (post.status == ContentStatus.approved) ...[
              const SizedBox(width: 8),
              ThuieIconButton(icon: LucideIcons.shieldOff, size: 18, color: c.danger, onTap: () {
                showThuieConfirm(context,
                  title: L10n.deleteContent,
                  body: L10n.takedownConfirm(post.title),
                  confirmLabel: L10n.takedown,
                  destructive: true,
                  onConfirm: () {
                    review.takedown('forum_post', post.id);
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.contentTakedownMsg), duration: const Duration(seconds: 1)));
                  },
                );
              }),
            ],
          ]),
        );
      },
    );
  }
}
