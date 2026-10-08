import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/favorites_notifier.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class InfoDetailScreen extends StatefulWidget {
  final String id;
  const InfoDetailScreen(this.id, {super.key});
  @override
  State<InfoDetailScreen> createState() => _InfoDetailScreenState();
}

class _InfoDetailScreenState extends State<InfoDetailScreen> {
  InfoPost? _detail;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    final infos = context.read<InfosNotifier>();
    final favorites = context.read<FavoritesNotifier>();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      // A detail fetch also records the view server-side (history is derived by
      // the detail endpoints, no client POST). Fall back to the cached feed row.
      final loaded = await infos.loadDetail(widget.id) ?? infos.byId(widget.id);
      favorites.load();
      if (!mounted) return;
      setState(() {
        _detail = loaded;
        _loading = false;
        _failed = loaded == null;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final info = _detail;
    final c = ThuieTheme.colorsOf(context);
    final favorites = context.watch<FavoritesNotifier>();
    final isFav = info == null ? false : favorites.isBookmarked(TargetType.info, info.id);

    if (_loading) {
      return ThuiePage(bar: ThuieBar(title: L10n.infoDetail), body: const Center(child: ThuieLoader()));
    }
    if (_failed || info == null || (info.status != ContentStatus.approved && info.status != ContentStatus.pending)) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.infoDetail),
        body: ResultState(
          icon: LucideIcons.fileQuestion,
          title: L10n.resultUnavailable,
          message: L10n.contentTakenDown,
          actionLabel: L10n.goBackAction,
        ),
      );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.infoDetail, actions: [
        ThuieIconButton(
          icon: LucideIcons.share, size: 20,
          onTap: () {
            final body = info.content;
            final snippet = body.length > 100 ? '${body.substring(0, 100)}...' : body;
            final shareText = '${info.title}\n\n$snippet\n\n— THUIE App';
            Share.share(shareText, subject: info.title);
          },
        ),
        ThuieIconButton(
          icon: isFav ? LucideIcons.bookmarkCheck : LucideIcons.bookmark,
          color: isFav ? c.accent : c.muted,
          onTap: () {
            favorites.toggle(TargetType.info, info.id);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(isFav ? L10n.unfavoritedMsg : L10n.favoritedMsg), duration: const Duration(seconds: 1)),
            );
          },
        ),
        ThuieIconButton(icon: LucideIcons.flag, size: 20, onTap: () {
          Navigator.of(context).pushNamed(Routes.report, arguments: ('info', info.id));
        }),
      ]),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [CategoryBadge(info.category), const SizedBox(width: 6), SourceBadge(info.source)]),
          const SizedBox(height: 12),
          Text(info.title, style: c.titleLarge),
          const SizedBox(height: 8),
          MetaText('${info.authorName} · ${Fmt.time(info.createdAt)}'),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(ThuieSpace.lg),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Text(info.content, style: c.bodyLarge),
          ),
        ]),
      ),
    );
  }
}
