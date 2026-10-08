import 'package:flutter/material.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_reports_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 report detail. The full [Report] row is handed over from the queue
/// (there is no single-report `GET`), and ignore / delete close it through
/// `POST /admin/reports/:id/resolve`.
class AdminReportDetailScreen extends StatelessWidget {
  final Report report;
  AdminReportDetailScreen(this.report, {super.key});

  final _notifier = AdminReportsNotifier();

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);

    return ThuiePage(
      bar: ThuieBar(title: L10n.reportDetailTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(ThuieSpace.lg),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Seal(text: L10n.targetTypeLabel(report.targetType), tone: SealTone.neutral),
                const SizedBox(width: 8),
                Seal(text: report.status == ReportStatus.open ? L10n.pendingLabel : L10n.resolvedLabel, tone: report.status == ReportStatus.open ? SealTone.warn : SealTone.ok),
              ]),
              const SizedBox(height: 12),
              Text(L10n.reportReasonTitle, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 4),
              Text(report.reason, style: c.bodyMedium),
              const SizedBox(height: 12),
              MetaText(L10n.reporterTimePrefix(report.reporterId, Fmt.relative(report.createdAt))),
            ]),
          ),
          const SizedBox(height: 20),
          if (report.status == ReportStatus.open) ...[
            Row(children: [
              Expanded(child: ThuieOutlinedButton(label: L10n.ignore, onTap: () {
                final messenger = ScaffoldMessenger.of(context);
                _notifier.resolve(report.id, 'ignored', note: L10n.ignoredLabel);
                Navigator.of(context).pop();
                messenger.showSnackBar(SnackBar(content: Text(L10n.reportHandledMsg), duration: const Duration(seconds: 1)));
              })),
              const SizedBox(width: 10),
              Expanded(child: ThuieFilledButton(label: L10n.deleteContent, danger: true, onTap: () {
                final messenger = ScaffoldMessenger.of(context);
                _notifier.resolve(report.id, 'deleted', note: L10n.deletedLabel);
                Navigator.of(context).pop();
                messenger.showSnackBar(SnackBar(content: Text(L10n.reportHandledMsg), duration: const Duration(seconds: 1)));
              })),
            ]),
          ],
        ]),
      ),
    );
  }
}
