import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/reports_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class ReportScreen extends StatefulWidget {
  final String targetType;
  final String targetId;
  const ReportScreen(this.targetType, this.targetId, {super.key});
  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  String _reason = '';
  String? _error;
  bool _busy = false;

  TargetType get _tt => switch (widget.targetType) {
        'info' => TargetType.info,
        'post' => TargetType.post,
        'comment' => TargetType.comment,
        'profile' => TargetType.profile,
        _ => TargetType.user,
      };

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.reportTitle),
      body: Padding(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(children: [
          FlatField(value: _reason, onChanged: (v) => _reason = v, label: L10n.reportReason, singleLine: false, maxLines: 4),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: c.danger, fontSize: 13)),
          ],
          const SizedBox(height: 16),
          ThuieFilledButton(label: L10n.submitReport, danger: true, onTap: _busy ? null : () async {
            final messenger = ScaffoldMessenger.of(context);
            final navigator = Navigator.of(context);
            if (_reason.trim().isEmpty) {
              messenger.showSnackBar(SnackBar(content: Text(L10n.fillReportReason)));
              return;
            }
            setState(() { _busy = true; _error = null; });
            final reports = context.read<ReportsNotifier>();
            final created = await reports.create(
              targetType: _tt,
              targetId: widget.targetId,
              reason: _reason.trim(),
            );
            if (!mounted) return;
            if (created != null) {
              navigator.pop();
              messenger.showSnackBar(SnackBar(content: Text(L10n.reportSubmittedMsg)));
            } else {
              final e = reports.error;
              setState(() {
                _busy = false;
                _error = e is ApiError ? L10n.describeApiError(e.code) : L10n.errGeneric;
              });
            }
          }),
        ]),
      ),
    );
  }
}
