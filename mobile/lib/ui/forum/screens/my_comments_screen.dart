import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/my_content_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// The viewer's own comments across all posts (`GET /me/comments`). The endpoint
/// returns every review state in one cursor page — no server-side status filter
/// — so each row just carries its own [StatusBadge]. Tapping opens the parent
/// post so the comment can be seen in context.
class MyCommentsScreen extends StatefulWidget {
  const MyCommentsScreen({super.key});
  @override
  State<MyCommentsScreen> createState() => _MyCommentsScreenState();
}

class _MyCommentsScreenState extends State<MyCommentsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<MyCommentsNotifier>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<MyCommentsNotifier>();
    final c = ThuieTheme.colorsOf(context);

    Widget list;
    switch (notifier.status) {
      case AsyncStatus.idle:
      case AsyncStatus.loading:
        list = const Center(child: ThuieLoader());
      case AsyncStatus.error:
        list = ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        );
      case AsyncStatus.ready:
        final mine = notifier.items;
        list = mine.isEmpty
            ? EmptyState(text: L10n.noCommentsYet, icon: LucideIcons.messageSquare)
            : ListView.separated(
                padding: const EdgeInsets.all(ThuieSpace.lg),
                itemCount: mine.length + (notifier.hasMore ? 1 : 0),
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  if (i >= mine.length) {
                    WidgetsBinding.instance
                        .addPostFrameCallback((_) => notifier.loadMore());
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Center(child: ThuieLoader()),
                    );
                  }
                  final comment = mine[i];
                  return GestureDetector(
                    onTap: () => Navigator.of(context)
                        .pushNamed(Routes.postDetail, arguments: comment.postId),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: c.surface,
                        borderRadius: BorderRadius.circular(ThuieRadii.md),
                        border: Border.all(color: c.hairline, width: 0.5),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          StatusBadge(comment.status),
                          const Spacer(),
                          MetaText(Fmt.relative(comment.createdAt)),
                        ]),
                        const SizedBox(height: 6),
                        Text(comment.content,
                            style: c.bodyMedium, maxLines: 3, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 6),
                        Row(children: [
                          Icon(LucideIcons.arrowUpRight, size: 13, color: c.accent),
                          const SizedBox(width: 4),
                          Text(L10n.openPost,
                              style: TextStyle(fontSize: 12, color: c.accent)),
                        ]),
                      ]),
                    ),
                  );
                },
              );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.myComments),
      body: RefreshIndicator(
        onRefresh: () => notifier.load(refresh: true),
        child: list,
      ),
    );
  }
}
