import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/faculty_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../theme/thuie_theme.dart';
import '../../components/common.dart';
import '../../../l10n.dart';
import 'faculty_detail_screen.dart';

class FacultyDirectoryScreen extends StatefulWidget {
  const FacultyDirectoryScreen({super.key});
  @override
  State<FacultyDirectoryScreen> createState() => _FacultyDirectoryScreenState();
}

class _FacultyDirectoryScreenState extends State<FacultyDirectoryScreen> {
  String _query = '';
  String? _filterDept;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<FacultyNotifier>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<FacultyNotifier>();
    var all = notifier.items;

    final departments = all.map((f) => f.department).toSet().toList()..sort();

    if (_filterDept != null) all = all.where((f) => f.department == _filterDept).toList();
    if (_query.isNotEmpty) {
      all = all.where((f) =>
          f.name.contains(_query) ||
          f.department.contains(_query) ||
          f.researchArea.contains(_query) ||
          f.title.contains(_query)).toList();
    }

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
        body = all.isEmpty
            ? EmptyState(text: L10n.noFaculty, icon: LucideIcons.graduationCap)
            : PagedListView<FacultyMember>(
                items: all,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                onLoadMore: notifier.hasMore ? notifier.loadMore : null,
                hasMore: notifier.hasMore,
                isLoadingMore: notifier.loadingMore,
                itemBuilder: (_, m) => _FacultyCard(
                  member: m,
                  onTap: () => Navigator.of(context).push(_facultyDetailRoute(m)),
                ),
              );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.facultyDirectory),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: FlatField(
            value: _query, onChanged: (v) => setState(() => _query = v),
            placeholder: L10n.searchFaculty,
            leadingIcon: const Icon(LucideIcons.search, size: 16),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _FilterChip(label: L10n.all, selected: _filterDept == null, onTap: () => setState(() => _filterDept = null)),
                for (final dept in departments)
                  _FilterChip(label: dept, selected: _filterDept == dept, onTap: () => setState(() => _filterDept = dept)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(child: RefreshIndicator(onRefresh: () => notifier.load(refresh: true), child: body)),
      ]),
    );
  }

  Route _facultyDetailRoute(FacultyMember m) {
    return MaterialPageRoute(builder: (_) => FacultyDetailScreen(m));
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(ThuieRadii.full),
          color: selected ? c.accentWeak : c.surface,
          border: Border.all(color: selected ? c.accent : c.hairline, width: 0.5),
        ),
        child: Center(
          child: Text(label, style: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w500,
            color: selected ? c.accent : c.ink2,
          )),
        ),
      ),
    );
  }
}

class _FacultyCard extends StatelessWidget {
  final FacultyMember member;
  final VoidCallback onTap;
  const _FacultyCard({required this.member, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          border: Border.all(color: c.hairline, width: 0.5),
        ),
        child: Row(children: [
          Avatar(name: member.name, seed: member.id.hashCode, size: 46, imagePath: member.imageUrl),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(member.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 2),
            Text(member.title, style: TextStyle(fontSize: 12, color: c.muted)),
            if (member.researchArea.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(children: [
                Icon(LucideIcons.flaskConical, size: 12, color: c.accent),
                const SizedBox(width: 4),
                Expanded(child: Text(member.researchArea, style: TextStyle(fontSize: 12, color: c.accent), overflow: TextOverflow.ellipsis)),
              ]),
            ],
          ])),
          Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
        ]),
      ),
    );
  }
}
