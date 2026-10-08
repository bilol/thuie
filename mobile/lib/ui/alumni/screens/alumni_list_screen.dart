import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'dart:async';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/alumni_notifier.dart';
import '../../../data/notifiers/connections_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class AlumniListScreen extends StatefulWidget {
  const AlumniListScreen({super.key});
  @override
  State<AlumniListScreen> createState() => _AlumniListScreenState();
}

class _AlumniListScreenState extends State<AlumniListScreen> {
  String? _filterCountry;
  String? _filterYear;
  String? _filterProgram;
  String? _filterCompany;
  final int _sortMode = 0;
  String _query = '';
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<AlumniNotifier>().load();
      context.read<ConnectionsNotifier>().loadAll();
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  // Server-backed name/company/title/bio search (`GET /alumni?q=`), debounced.
  void _onQueryChanged(String value) {
    setState(() => _query = value);
    _debounce?.cancel();
    final notifier = context.read<AlumniNotifier>();
    _debounce = Timer(const Duration(milliseconds: 350), () => notifier.setQuery(value.trim()));
  }

  void _pickFilter(String title, List<String> options, String? current, ValueChanged<String> onSelect) {
    final c = ThuieTheme.colorsOf(context);
    showThuieBottomSheet(context, builder: (_) {
      return StatefulBuilder(builder: (_, setModalState) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.ink)),
              const Spacer(),
              if (current != null)
                GestureDetector(
                  onTap: () { onSelect(''); Navigator.pop(context); },
                  child: Text(L10n.clearFilter, style: TextStyle(fontSize: 14, color: c.danger)),
                ),
            ]),
            const SizedBox(height: 12),
            Flexible(
              child: Wrap(spacing: 8, runSpacing: 8, children: [
                for (final opt in options)
                  _AlumniFilterChip(
                    label: opt,
                    selected: opt == current,
                    onTap: () {
                      onSelect(opt);
                      Navigator.pop(context);
                    },
                  ),
              ]),
            ),
          ]),
        );
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AlumniNotifier>();
    final user = context.watch<AuthSession>().user;
    if (user == null) return const SizedBox.shrink();
    final c = ThuieTheme.colorsOf(context);

    // Server returns only viewer-visible profiles; derive the filter option
    // pools from the loaded feed and apply the remaining facets client-side.
    final loaded = notifier.items;
    final countries = loaded.map((p) => p.country).where((x) => x.isNotEmpty).toSet().toList()..sort();
    final years = loaded
        .map((p) => p.graduationYear)
        .where((y) => y != null && y.isNotEmpty)
        .toSet()
        .toList()
      ..sort((a, b) => b!.compareTo(a!));
    final companies = loaded.map((p) => p.company).where((x) => x.isNotEmpty).toSet().toList()..sort();

    var all = loaded;
    if (_filterCountry != null) all = all.where((p) => p.country == _filterCountry).toList();
    if (_filterYear != null) all = all.where((p) => p.graduationYear == _filterYear).toList();
    if (_filterProgram != null) all = all.where((p) => p.program == _filterProgram).toList();
    if (_filterCompany != null) all = all.where((p) => p.company == _filterCompany).toList();
    switch (_sortMode) {
      case 1: all = [...all]..sort((a, b) => a.displayName.compareTo(b.displayName));
      case 2: all = [...all]..sort((a, b) => (b.graduationYear ?? '').compareTo(a.graduationYear ?? ''));
    }

    final hasFilters = _filterCountry != null || _filterYear != null || _filterProgram != null || _filterCompany != null;

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
        list = all.isEmpty
            ? EmptyState(text: L10n.noAlumni, icon: LucideIcons.users)
            : PagedListView<AlumniProfile>(
                items: all,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                onLoadMore: notifier.hasMore ? notifier.loadMore : null,
                hasMore: notifier.hasMore,
                isLoadingMore: notifier.loadingMore,
                itemBuilder: (_, p) => _AlumniCard(profile: p, currentUserId: user.id,
                    onTap: () => Navigator.of(context).pushNamed(Routes.alumniDetail, arguments: p.id)),
              );
    }

    return ThuieRefreshIndicator(
      onRefresh: () => notifier.load(refresh: true),
      child: Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        child: FlatField(
          value: _query, onChanged: _onQueryChanged,
          placeholder: L10n.searchAlumni,
          leadingIcon: const Icon(LucideIcons.search, size: 16),
          trailingIcon: _query.isEmpty ? null : const Icon(LucideIcons.x, size: 16),
          onTrailingTap: () => _onQueryChanged(''),
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
        child: Row(children: [
          Expanded(child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              _FilterButton(label: L10n.programShort, value: _filterProgram, onTap: () => _pickFilter(L10n.programSection, L10n.programCodes, _filterProgram, (v) => setState(() => _filterProgram = v))),
              _FilterButton(label: L10n.countryShort, value: _filterCountry, onTap: () => _pickFilter(L10n.countryShort, countries, _filterCountry, (v) => setState(() => _filterCountry = v))),
              _FilterButton(label: L10n.classOfLabel, value: _filterYear != null ? '$_filterYear${L10n.classOfSuffix}' : null, onTap: () {
                final suffix = L10n.classOfSuffix;
                _pickFilter(L10n.classOfLabel, years.map((y) => '$y$suffix').toList(), _filterYear != null ? '$_filterYear$suffix' : null, (v) => setState(() => _filterYear = v.replaceAll(suffix, '').trim()));
              }),
              _FilterButton(label: L10n.companyShort, value: _filterCompany, onTap: () => _pickFilter(L10n.companyShort, companies, _filterCompany, (v) => setState(() => _filterCompany = v))),
            ]),
          )),
          if (hasFilters)
            GestureDetector(
              onTap: () => setState(() { _filterCountry = null; _filterYear = null; _filterProgram = null; _filterCompany = null; }),
              child: Padding(
                padding: const EdgeInsets.only(left: 8),
                child: Text(L10n.clearFilter, style: TextStyle(fontSize: 12, color: c.danger, fontWeight: FontWeight.w500)),
              ),
            ),
        ]),
      ),
      Expanded(child: list),
    ]),
    );
  }
}

class _FilterButton extends StatelessWidget {
  final String label;
  final String? value;
  final VoidCallback onTap;
  const _FilterButton({required this.label, this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final active = value != null;
    return GestureDetector(
      onTap: () {
        ThuieHaptics.tab();
        onTap();
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(ThuieRadii.full),
          color: active ? c.accentWeak : c.surface,
          border: Border.all(color: active ? c.accent : c.hairline, width: 0.5),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: active ? c.accent : c.ink2)),
          if (active) ...[
            const SizedBox(width: 4),
            Text(value!, style: TextStyle(fontSize: 11, color: c.accent, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(width: 2),
          Icon(LucideIcons.chevronDown, size: 12, color: active ? c.accent : c.muted),
        ]),
      ),
    );
  }
}

class _AlumniFilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _AlumniFilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: () {
        ThuieHaptics.tab();
        onTap();
      },
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

class _AlumniCard extends StatelessWidget {
  final AlumniProfile profile;
  final String currentUserId;
  final VoidCallback onTap;
  const _AlumniCard({required this.profile, required this.currentUserId, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final isSelf = profile.userId == currentUserId;
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
          Avatar(name: profile.displayName, seed: profile.displayName.hashCode, size: 46, imagePath: profile.avatarUrl),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Flexible(child: Text(profile.displayName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15), overflow: TextOverflow.ellipsis)),
              if (profile.source == ProfileSource.school) ...[const SizedBox(width: 6), const SchoolBadge()],
            ]),
            const SizedBox(height: 2),
            Text(
              [profile.workTitle, profile.company.isNotEmpty ? '@ ${profile.company}' : null, profile.industry, profile.city].where((s) => s != null && s.isNotEmpty).join(' · '),
              style: TextStyle(fontSize: 12, color: c.muted), maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            MetaText('${profile.department} ${profile.graduationYear != null ? '${profile.graduationYear}${L10n.classOfSuffix}' : profile.gradeYear != null ? '${profile.gradeYear}${L10n.classOfGrade}' : ''}'),
          ])),
          if (!isSelf && profile.userId != null) ...[
            const SizedBox(width: 10),
            _CompactConnectButton(profileUserId: profile.userId!, currentUserId: currentUserId),
          ],
        ]),
      ),
    );
  }
}

class _CompactConnectButton extends StatelessWidget {
  final String profileUserId;
  final String currentUserId;
  const _CompactConnectButton({required this.profileUserId, required this.currentUserId});

  @override
  Widget build(BuildContext context) {
    final connections = context.watch<ConnectionsNotifier>();
    final isConnected = connections.isConnectedWith(profileUserId);
    final hasPending = connections.hasPendingOutgoingTo(profileUserId);
    final c = ThuieTheme.colorsOf(context);

    if (isConnected) {
      return Container(
        width: 36, height: 36,
        decoration: BoxDecoration(color: c.okWeak, shape: BoxShape.circle),
        child: Icon(LucideIcons.userCheck, size: 16, color: c.ok),
      );
    }
    if (hasPending) {
      return Container(
        width: 36, height: 36,
        decoration: BoxDecoration(color: c.warnWeak, shape: BoxShape.circle),
        child: Icon(LucideIcons.clock, size: 16, color: c.warn),
      );
    }
    return GestureDetector(
      onTap: () async {
        ThuieHaptics.connect();
        final messenger = ScaffoldMessenger.of(context);
        final sent = await connections.send(profileUserId);
        if (sent == null) {
          messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(connections.error?.code)), duration: const Duration(seconds: 2)));
          return;
        }
        messenger.showSnackBar(
          SnackBar(content: Text(L10n.connectionSentMsg), duration: const Duration(seconds: 1)),
        );
      },
      child: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(color: c.accent, shape: BoxShape.circle),
        child: const Icon(LucideIcons.userPlus, size: 16, color: Colors.white),
      ),
    );
  }
}
