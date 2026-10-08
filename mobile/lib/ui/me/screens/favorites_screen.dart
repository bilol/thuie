import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/favorites_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../components/target_title.dart';
import '../../theme/thuie_theme.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});
  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<FavoritesNotifier>().load();
    });
  }

  void _open(Favorite f) {
    final route = switch (f.targetType) {
      TargetType.info => Routes.infoDetail,
      TargetType.post => Routes.postDetail,
      TargetType.profile => Routes.alumniDetail,
      _ => null,
    };
    if (route != null) {
      Navigator.of(context).pushNamed(route, arguments: f.targetId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<FavoritesNotifier>();
    final c = ThuieTheme.colorsOf(context);

    Widget body;
    switch (notifier.status) {
      case AsyncStatus.idle:
      case AsyncStatus.loading:
        body = const Center(child: ThuieLoader());
      case AsyncStatus.error:
        body = ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        );
      case AsyncStatus.ready:
        body = notifier.items.isEmpty
            ? EmptyState(text: L10n.noFavoritesYet, icon: LucideIcons.bookmark)
            : PagedListView<Favorite>(
                items: notifier.items,
                padding: const EdgeInsets.all(ThuieSpace.lg),
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                onLoadMore: notifier.hasMore ? notifier.loadMore : null,
                hasMore: notifier.hasMore,
                isLoadingMore: notifier.loadingMore,
                itemBuilder: (_, f) => SwipeableTile(
                  key: ValueKey('fav_${f.targetType}_${f.targetId}'),
                  rightActions: [
                    SwipeAction(
                      icon: LucideIcons.trash2,
                      color: c.danger,
                      label: L10n.delete,
                      onTap: () => notifier.remove(f.targetType, f.targetId),
                    ),
                  ],
                  child: GestureDetector(
                    onTap: () => _open(f),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: c.surface,
                        borderRadius: BorderRadius.circular(ThuieRadii.md),
                        border: Border.all(color: c.hairline, width: 0.5),
                      ),
                      child: Row(children: [
                        Expanded(child: TargetTitle(type: f.targetType, targetId: f.targetId)),
                        Icon(LucideIcons.chevronRight, color: c.muted),
                      ]),
                    ),
                  ),
                ),
              );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.favoritesTitle),
      body: RefreshIndicator(onRefresh: () => notifier.load(refresh: true), child: body),
    );
  }
}
