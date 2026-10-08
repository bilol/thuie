import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/admin_stats_notifier.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/stat_card.dart';

/// §6.17 admin console home. The dashboard counters + pending-queue subtitles
/// come from `GET /admin/stats`; publishing an official info opens the
/// full-screen [AdminPublishInfoScreen]. Reached by pushing [Routes.adminHome]
/// from the Me tab, so the bar's back arrow appears automatically.
class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});
  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  final _notifier = AdminStatsNotifier();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _notifier.load());
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AdminStatsNotifier>.value(
      value: _notifier,
      child: const _AdminHomeBody(),
    );
  }
}

class _AdminHomeBody extends StatelessWidget {
  const _AdminHomeBody();
  @override
  Widget build(BuildContext context) {
    final stats = context.watch<AdminStatsNotifier>().stats;
    final session = context.read<AuthSession>();
    final pending = '${stats.pendingReview} ${L10n.pendingReviewSuffix}';

    final content = ListView(padding: const EdgeInsets.all(ThuieSpace.lg), children: [
        _StatGrid(stats: stats),
        const SizedBox(height: 20),
        _AdminMenu(title: L10n.infoManagement, items: [
          _MenuItem(L10n.infoReview, pending, () => Navigator.of(context).pushNamed(Routes.adminInfoList)),
          _AdminMenuItem(L10n.publishOfficialInfo, () => Navigator.of(context).pushNamed(Routes.adminPublishInfo)),
        ]),
        _AdminMenu(title: L10n.alumniManagement, items: [
          _MenuItem(L10n.alumniReview, pending, () => Navigator.of(context).pushNamed(Routes.adminProfiles)),
        ]),
        _AdminMenu(title: L10n.forumManagement, items: [
          _MenuItem(L10n.postReview, pending, () => Navigator.of(context).pushNamed(Routes.adminPosts)),
          _AdminMenuItem(L10n.keywordManagement, () => Navigator.of(context).pushNamed(Routes.adminKeywords)),
        ]),
        _AdminMenu(title: L10n.facultyManagement, items: [
          _AdminMenuItem(L10n.manageFaculty, () => Navigator.of(context).pushNamed(Routes.adminFaculty)),
        ]),
        _AdminMenu(title: L10n.eventManagement, items: [
          _AdminMenuItem(L10n.manageEvents, () => Navigator.of(context).pushNamed(Routes.adminEvents)),
        ]),
        _AdminMenu(title: L10n.userManagement, items: [
          _AdminMenuItem(L10n.userList, () => Navigator.of(context).pushNamed(Routes.adminUsers, arguments: 'STUDENT')),
        ]),
        _AdminMenu(title: L10n.systemLabel, items: [
          _MenuItem(L10n.reportHandling, '${stats.openReports} ${L10n.pendingLabel}', () => Navigator.of(context).pushNamed(Routes.adminReports)),
          _AdminMenuItem(L10n.userFeedback, () => Navigator.of(context).pushNamed(Routes.adminFeedback)),
          // NOTE: broadcast fan-out is still not wired — the backend exposes no
          // `POST /admin/broadcast`, so we don't advertise an action that would
          // dead-end. Add the endpoint first, then re-surface it here.
          // Role-strategy flags are admin_super-only on the backend; hide the
          // entry from plain admins so they never hit a 403.
          if (session.isAdminSuper)
            _AdminMenuItem(L10n.openStrategy, () => Navigator.of(context).pushNamed(Routes.adminStrategy)),
          _AdminMenuItem(L10n.operationLogs, () => Navigator.of(context).pushNamed(Routes.adminLogs)),
          _AdminMenuItem(L10n.dataStats, () => Navigator.of(context).pushNamed(Routes.adminStats)),
        ]),
      ],
    );

    return ThuiePage(
      bar: ThuieBar(title: L10n.adminHomeTitle),
      body: content,
    );
  }
}

class _StatGrid extends StatelessWidget {
  final AdminStats stats;
  const _StatGrid({required this.stats});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 2.1,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      children: [
        StatCard(label: L10n.totalUsers, value: '${stats.totalUsers}', color: c.accent),
        StatCard(label: L10n.totalInfosStat, value: '${stats.totalInfos}', color: c.ok),
        StatCard(label: L10n.totalPostsStat, value: '${stats.totalPosts}', color: c.bronze),
        StatCard(label: L10n.pendingReview, value: '${stats.pendingReview}', color: c.warn),
      ],
    );
  }
}

class _AdminMenu extends StatelessWidget {
  final String title;
  final List<Widget> items;
  const _AdminMenu({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: c.titleMedium),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: ThuieTheme.colorsOf(context).hairline, width: 0.5),
          ),
          child: Column(children: items),
        ),
      ]),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final String label, subtitle;
  final VoidCallback onTap;
  const _MenuItem(this.label, this.subtitle, this.onTap);

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
          Text(subtitle, style: TextStyle(fontSize: 12, color: c.muted)),
          const SizedBox(width: 4),
          Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
        ]),
      ),
    );
  }
}

class _AdminMenuItem extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _AdminMenuItem(this.label, this.onTap);

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
          Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
        ]),
      ),
    );
  }
}
