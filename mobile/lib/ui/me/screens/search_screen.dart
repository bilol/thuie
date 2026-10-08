import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/search_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  String _query = '';
  int _tab = 0;
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    setState(() => _query = value);
    _debounce?.cancel();
    final notifier = context.read<SearchNotifier>();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      notifier.run(value);
      notifier.suggest(value);
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final notifier = context.watch<SearchNotifier>();
    final user = context.watch<AuthSession>().user;
    if (user == null) return ThuiePage(body: Center(child: Text(L10n.pleaseLogin)));

    final infos = notifier.byType('info');
    final posts = notifier.byType('post');
    final profiles = notifier.byType('profile');
    final hasQuery = _query.trim().isNotEmpty;

    return ThuiePage(
      bar: ThuieBar(title: L10n.searchTitle),
      // Everything (field, suggestions, tabs, results) scrolls in one sliver
      // view: when the keyboard opens the fixed header scrolls away instead of
      // overflowing the bottom of a Column whose Expanded has nowhere to go.
      body: CustomScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: FlatField(
                value: _query, onChanged: _onQueryChanged,
                placeholder: L10n.searchPlaceholder,
                leadingIcon: Icon(LucideIcons.search, size: 16, color: c.muted),
              ),
            ),
          ),
          if (hasQuery && notifier.suggestions.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(spacing: 6, runSpacing: 6, children: [
                    for (final s in notifier.suggestions)
                      GestureDetector(
                        onTap: () => _onQueryChanged(s.label),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: c.accentWeak,
                            borderRadius: BorderRadius.circular(ThuieRadii.full),
                          ),
                          child: Text(s.label, style: TextStyle(fontSize: 12, color: c.accent)),
                        ),
                      ),
                  ]),
                ),
              ),
            ),
          if (hasQuery) ...[
            SliverToBoxAdapter(
              child: SegmentedRow<int>(
                options: const [0, 1, 2], selected: _tab,
                onSelect: (v) => setState(() => _tab = v),
                label: (v) => switch (v) { 0 => '${L10n.info} (${infos.length})', 1 => '${L10n.forum} (${posts.length})', _ => '${L10n.alumni} (${profiles.length})' },
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            ..._resultsSlivers(notifier, infos, posts, profiles),
          ] else
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(LucideIcons.search, size: 48, color: c.muted),
                const SizedBox(height: 12),
                Text(L10n.searchKeywordHint, style: TextStyle(color: c.muted, fontSize: 14)),
              ])),
            ),
        ],
      ),
    );
  }

  /// Result slivers for the active tab, keyed off [SearchNotifier.status]. Each
  /// branch fills the remaining viewport (loader / error / empty) so the header
  /// stays scrollable and nothing overflows when the keyboard is up.
  List<Widget> _resultsSlivers(SearchNotifier notifier,
      List<SearchHit> infos, List<SearchHit> posts, List<SearchHit> profiles) {
    return switch (notifier.status) {
      AsyncStatus.idle || AsyncStatus.loading => const [
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(child: ThuieLoader()),
          ),
        ],
      AsyncStatus.error => [
          SliverFillRemaining(
            hasScrollBody: false,
            child: ResultState(
              icon: LucideIcons.wifiOff,
              title: L10n.errGeneric,
              actionLabel: L10n.retry,
              onAction: () => notifier.run(_query),
            ),
          ),
        ],
      AsyncStatus.ready => _listSlivers(
          switch (_tab) { 0 => infos, 1 => posts, _ => profiles },
          withAvatar: _tab == 2,
        ),
    };
  }

  List<Widget> _listSlivers(List<SearchHit> hits, {bool withAvatar = false}) {
    if (hits.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(text: L10n.searchNoResults(_query), icon: LucideIcons.searchX),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverList.builder(
          itemCount: hits.length,
          itemBuilder: (_, i) => Padding(
            padding: EdgeInsets.only(bottom: i == hits.length - 1 ? 16 : 8),
            child: _hitTile(hits[i], withAvatar: withAvatar),
          ),
        ),
      ),
    ];
  }

  Widget _hitTile(SearchHit hit, {bool withAvatar = false}) {
    final c = ThuieTheme.colorsOf(context);
    final box = BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(ThuieRadii.md), border: Border.all(color: c.hairline, width: 0.5));
    final route = switch (hit.type) {
      'info' => Routes.infoDetail,
      'post' => Routes.postDetail,
      'profile' => Routes.alumniDetail,
      _ => null,
    };
    return GestureDetector(
      onTap: () {
        if (route != null) Navigator.of(context).pushNamed(route, arguments: hit.id);
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: box,
        child: Row(children: [
          if (withAvatar) ...[
            Avatar(name: hit.title, seed: hit.id.hashCode, size: 36),
            const SizedBox(width: 12),
          ],
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(hit.title, style: const TextStyle(fontWeight: FontWeight.w500)),
            if (hit.subtitle.isNotEmpty) ...[
              const SizedBox(height: 4),
              MetaText(hit.subtitle),
            ],
          ])),
        ]),
      ),
    );
  }
}
