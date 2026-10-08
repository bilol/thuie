import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../data/notifiers/admin_stats_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/stat_card.dart';

/// §6.17 admin analytics. Backed by `GET /admin/stats`, which returns a single
/// flat aggregate — the console surfaces those server-authoritative counters
/// (the mock's in-memory nationality / program / growth rollups had no endpoint
/// and are gone).
class AdminStatsScreen extends StatefulWidget {
  const AdminStatsScreen({super.key});
  @override
  State<AdminStatsScreen> createState() => _AdminStatsScreenState();
}

class _AdminStatsScreenState extends State<AdminStatsScreen> {
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
      child: const _AdminStatsBody(),
    );
  }
}

class _AdminStatsBody extends StatelessWidget {
  const _AdminStatsBody();
  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AdminStatsNotifier>();
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
      AsyncStatus.ready => () {
          final s = notifier.stats;
          return ListView(padding: const EdgeInsets.all(ThuieSpace.lg), children: [
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              childAspectRatio: 1.9,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              children: [
                StatCard(label: L10n.totalUsers, value: '${s.totalUsers}', color: c.accent, icon: LucideIcons.users),
                StatCard(label: L10n.activeDailyLabel, value: '${s.dau}', color: c.ok, icon: LucideIcons.activity),
                StatCard(label: L10n.activeWeeklyLabel, value: '${s.wau}', color: c.bronze, icon: LucideIcons.calculator),
                StatCard(label: L10n.signups7dLabel, value: '${s.signups7d}', color: c.warn, icon: LucideIcons.userPlus),
              ],
            ),
            const SizedBox(height: 20),
            _StatsSection(title: L10n.contentStats, items: [
              _StatsItem(label: L10n.totalInfosStat, value: '${s.totalInfos}', color: c.ok),
              _StatsItem(label: L10n.totalPostsStat, value: '${s.totalPosts}', color: c.accent),
              _StatsItem(label: L10n.totalProfilesStat, value: '${s.totalProfiles}', color: c.bronze),
            ]),
            const SizedBox(height: 16),
            _StatsSection(title: L10n.pendingTasks, items: [
              _StatsItem(label: L10n.pendingReview, value: '${s.pendingReview}', color: c.warn),
              _StatsItem(label: L10n.pendingReportsLabel, value: '${s.openReports}', color: c.danger),
              _StatsItem(label: L10n.oldestReportHoursLabel, value: '${s.oldestOpenReportHours}', color: c.danger),
            ]),
          ]);
        }(),
    };

    return ThuiePage(bar: ThuieBar(title: L10n.analyticsTitle), body: body);
  }
}

class _StatsSection extends StatelessWidget {
  final String title;
  final List<_StatsItem> items;
  const _StatsSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: c.titleMedium),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          border: Border.all(color: c.hairline, width: 0.5),
        ),
        child: Column(children: [
          for (int i = 0; i < items.length; i++) ...[
            Row(children: [
              Expanded(child: Text(items[i].label, style: TextStyle(fontSize: 14, color: c.ink2))),
              Text(items[i].value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: items[i].color)),
            ]),
            if (i < items.length - 1) Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Divider(height: 0.5, color: c.hairline),
            ),
          ],
        ]),
      ),
    ]);
  }
}

class _StatsItem {
  final String label, value;
  final Color color;
  const _StatsItem({required this.label, required this.value, required this.color});
}
