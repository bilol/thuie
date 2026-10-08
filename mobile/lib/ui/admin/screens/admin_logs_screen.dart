import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/notifiers/admin_logs_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 admin audit trail (`GET /admin/operation-logs`, offset paged).
class AdminLogsScreen extends StatefulWidget {
  const AdminLogsScreen({super.key});
  @override
  State<AdminLogsScreen> createState() => _AdminLogsScreenState();
}

class _AdminLogsScreenState extends State<AdminLogsScreen> {
  final _notifier = AdminLogsNotifier();

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
    return ChangeNotifierProvider<AdminLogsNotifier>.value(
      value: _notifier,
      child: const _AdminLogsBody(),
    );
  }
}

class _AdminLogsBody extends StatefulWidget {
  const _AdminLogsBody();
  @override
  State<_AdminLogsBody> createState() => _AdminLogsBodyState();
}

class _AdminLogsBodyState extends State<_AdminLogsBody> {
  bool _busy = false;

  void _clear(AdminLogsNotifier notifier) {
    if (_busy) return;
    showThuieConfirm(
      context,
      title: L10n.clearLogs,
      body: L10n.clearLogsConfirmBody,
      confirmLabel: L10n.clearLogs,
      destructive: true,
      onConfirm: () => _runClear(notifier),
    );
  }

  Future<void> _runClear(AdminLogsNotifier notifier) async {
    if (_busy) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    final deleted = await notifier.clearLogs();
    if (!mounted) return;
    setState(() => _busy = false);
    messenger.showSnackBar(SnackBar(
      content: Text(deleted == null ? L10n.actionError(notifier.error?.code) : L10n.clearLogsDone),
      duration: const Duration(seconds: 2),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AdminLogsNotifier>();
    final logs = notifier.items;
    final c = ThuieTheme.colorsOf(context);

    final body = switch (notifier.status) {
      AsyncStatus.idle || AsyncStatus.loading => const Center(child: ThuieLoader()),
      AsyncStatus.error => ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        ),
      AsyncStatus.ready => logs.isEmpty
          ? EmptyState(text: L10n.noLogs)
          : ListView.separated(
              padding: const EdgeInsets.all(ThuieSpace.lg),
              itemCount: logs.length + (notifier.hasMorePages ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 6),
              itemBuilder: (_, i) {
                if (i >= logs.length) {
                  return Center(
                    child: TextButton(
                      onPressed: notifier.loadMore,
                      child: Text(L10n.loadMore,
                          style: TextStyle(fontSize: 12, color: c.muted)),
                    ),
                  );
                }
                final l = logs[i];
                final detail = L10n.opDetailLabel(l.detail);
                final meta = <String>[
                  if (l.adminName.isNotEmpty) l.adminName,
                  if (detail.isNotEmpty) detail,
                  Fmt.relative(l.createdAt),
                ].join(' · ');
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(ThuieRadii.sm),
                    border: Border.all(color: c.hairline, width: 0.5),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(L10n.describeOperation(l.action, l.targetType),
                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                    const SizedBox(height: 4),
                    MetaText(meta),
                  ]),
                );
              },
            ),
    };

    return ThuiePage(
      bar: ThuieBar(
        title: L10n.operationLogs,
        actions: [
          if (notifier.isReady && logs.isNotEmpty)
            if (_busy)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              )
            else
              ThuieIconButton(
                icon: LucideIcons.trash2,
                size: 20,
                tooltip: L10n.clearLogs,
                onTap: () => _clear(notifier),
              ),
        ],
      ),
      body: body,
    );
  }
}
