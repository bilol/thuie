import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/admin_reports_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 open reports queue (`GET /admin/reports?status=open`). Ignore / delete
/// close a report through `POST /admin/reports/:id/resolve`.
class AdminReportsScreen extends StatefulWidget {
  const AdminReportsScreen({super.key});
  @override
  State<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends State<AdminReportsScreen> {
  final _notifier = AdminReportsNotifier(statusFilter: 'open');

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
    return ChangeNotifierProvider<AdminReportsNotifier>.value(
      value: _notifier,
      child: const _AdminReportsBody(),
    );
  }
}

class _AdminReportsBody extends StatelessWidget {
  const _AdminReportsBody();
  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AdminReportsNotifier>();
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
          ? EmptyState(text: L10n.noReports)
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
                final r = notifier.items[i];
                return GestureDetector(
                  onTap: () => Navigator.of(context).pushNamed(Routes.adminReportDetail, arguments: r),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(ThuieRadii.md),
                      border: Border.all(color: c.hairline, width: 0.5),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(L10n.targetTypeReason(L10n.targetTypeLabel(r.targetType), r.reason), style: const TextStyle(fontSize: 14)),
                      const SizedBox(height: 8),
                      Row(children: [
                        Expanded(child: ThuieOutlinedButton(label: L10n.ignore, onTap: () {
                          notifier.resolve(r.id, 'ignored', note: L10n.ignoredLabel);
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reportHandledMsg), duration: const Duration(seconds: 1)));
                        })),
                        const SizedBox(width: 10),
                        Expanded(child: ThuieFilledButton(label: L10n.deleteContent, danger: true, onTap: () {
                          notifier.resolve(r.id, 'deleted', note: L10n.deletedLabel);
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reportHandledMsg), duration: const Duration(seconds: 1)));
                        })),
                      ]),
                    ]),
                  ),
                );
              },
            ),
    };

    return ThuiePage(bar: ThuieBar(title: L10n.reportHandling), body: body);
  }
}
