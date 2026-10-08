import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../data/remote/json_utils.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class InfoListScreen extends StatefulWidget {
  const InfoListScreen({super.key});
  @override
  State<InfoListScreen> createState() => _InfoListScreenState();
}

class _InfoListScreenState extends State<InfoListScreen> {
  String _query = '';
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<InfosNotifier>().load();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  // Search is server-backed and debounced — the feed only holds the loaded
  // page, so client-side filtering would silently miss everything not pulled.
  void _onQueryChanged(String value) {
    setState(() => _query = value);
    _debounce?.cancel();
    final notifier = context.read<InfosNotifier>();
    _debounce = Timer(const Duration(milliseconds: 350), () => notifier.setQuery(value.trim()));
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<InfosNotifier>();
    final session = context.watch<AuthSession>();
    final c = ThuieTheme.colorsOf(context);
    final canSubmit = session.roleStrategy?.canSubmitInfo ?? false;

    // The server applies visibility + moderation + the `q`/`category` filters,
    // so the feed is exactly what this viewer sees for the active search/filter.
    final list = notifier.items;

    final categories = <(String, String?)>[
      (L10n.allLabel, null),
      (L10n.campusLabel, enumToWire(InfoCategory.internal)),
      (L10n.openLabel, enumToWire(InfoCategory.open)),
      (L10n.recruitmentLabel, enumToWire(InfoCategory.recruitment)),
    ];

    final body = Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
        child: Row(children: [
          Expanded(child: FlatField(
            value: _query, onChanged: _onQueryChanged,
            placeholder: L10n.searchInfoPlaceholder,
            leadingIcon: const Icon(LucideIcons.search, size: 16),
            trailingIcon: _query.isEmpty ? null : const Icon(LucideIcons.x, size: 16),
            onTrailingTap: () => _onQueryChanged(''),
          )),
        ]),
      ),
      // Category filter as an inline chip row (matches the alumni directory),
      // applying server-side immediately — no separate apply/"Done" step.
      Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              for (final (label, value) in categories)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _CategoryChip(
                    label: label,
                    selected: notifier.category == value,
                    onTap: () => notifier.setCategory(value),
                  ),
                ),
              // "Official only" is an orthogonal source filter, surfaced as a
              // toggleable chip alongside the categories (not a separate switch).
              Container(
                width: 1,
                height: 20,
                color: c.hairline,
                margin: const EdgeInsets.only(right: 8),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _CategoryChip(
                  label: L10n.officialOnly,
                  selected: notifier.source == 'official',
                  onTap: () => notifier.setOfficialOnly(notifier.source != 'official'),
                ),
              ),
            ],
          ),
        ),
      ),
      Expanded(child: _body(notifier, list, c)),
    ]);

    if (!canSubmit) return body;
    return Stack(children: [
      body,
      Positioned(
        right: 16, bottom: 16,
        child: FloatingActionButton(
          heroTag: 'infoSubmit',
          tooltip: L10n.submitInfo,
          onPressed: () => Navigator.of(context).pushNamed(Routes.infoSubmit),
          child: const Icon(LucideIcons.plus),
        ),
      ),
    ]);
  }

  Widget _body(InfosNotifier notifier, List<InfoPost> list, ThuieColors c) {
    Widget content;
    switch (notifier.status) {
      case AsyncStatus.idle:
      case AsyncStatus.loading:
        if (notifier.items.isNotEmpty) break;
        content = const Center(child: ThuieLoader());
        return content;
      case AsyncStatus.error:
        content = ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          message: notifier.error is ApiError ? L10n.describeApiError((notifier.error as ApiError).code) : null,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        );
        return content;
      case AsyncStatus.ready:
        break;
    }
    content = list.isEmpty
        ? EmptyState(
            text: _query.isNotEmpty || notifier.category != null || notifier.source != null ? L10n.searchNoResults(_query) : L10n.noInfo,
            icon: LucideIcons.newspaper,
          )
        : PagedListView(
            items: list,
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 88),
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            onLoadMore: notifier.loadMore,
            hasMore: notifier.hasMore,
            isLoadingMore: notifier.loadingMore,
            itemBuilder: (_, info) => _InfoListCard(info: info, onTap: () => Navigator.of(context).pushNamed(Routes.infoDetail, arguments: info.id)),
          );
    return RefreshIndicator(onRefresh: () => notifier.load(refresh: true), child: content);
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _CategoryChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: () {
        ThuieHaptics.tab();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(ThuieRadii.full),
          color: selected ? c.accentWeak : c.surface,
          border: Border.all(color: selected ? c.accent : c.hairline, width: 0.5),
        ),
        child: Text(label, style: TextStyle(
          fontSize: 12, fontWeight: FontWeight.w500,
          color: selected ? c.accent : c.ink2,
        )),
      ),
    );
  }
}

class _InfoListCard extends StatelessWidget {
  final InfoPost info;
  final VoidCallback onTap;
  const _InfoListCard({required this.info, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return InfoCard(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Avatar(name: info.authorName, seed: info.authorId.hashCode, size: 36, imagePath: info.authorAvatarUrl),
          const SizedBox(width: 10),
          Expanded(child: Row(children: [
            Flexible(child: Text(info.authorName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), overflow: TextOverflow.ellipsis)),
            const SizedBox(width: 6),
            SourceBadge(info.source),
          ])),
        ]),
        const SizedBox(height: 10),
        Text(info.title, style: c.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 6),
        Text(info.content, style: TextStyle(fontSize: 13, color: c.muted), maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 6),
        MetaText(Fmt.relative(info.createdAt)),
        const SizedBox(height: 8),
        Row(children: [
          CategoryBadge(info.category),
          if (info.pinned) ...[const SizedBox(width: 8), const PinnedLabel()],
        ]),
      ]),
    );
  }
}
