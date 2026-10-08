import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../data/notifiers/my_content_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Status tab options for the wire `status` filter: null = all.
const _statusOptions = <String?>[null, 'pending', 'approved', 'rejected'];

String _statusLabel(String? s) => switch (s) {
      null => L10n.allLabel,
      'pending' => L10n.statusPending,
      'approved' => L10n.statusApproved,
      _ => L10n.statusRejected,
    };

class MyInfosScreen extends StatefulWidget {
  const MyInfosScreen({super.key});
  @override
  State<MyInfosScreen> createState() => _MyInfosScreenState();
}

class _MyInfosScreenState extends State<MyInfosScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<MyInfosNotifier>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<MyInfosNotifier>();
    final c = ThuieTheme.colorsOf(context);

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
        final mine = notifier.items;
        list = mine.isEmpty
            ? EmptyState(
                text: L10n.noInfo,
                icon: LucideIcons.fileText,
                actionLabel: L10n.submitInfo,
                onAction: () => Navigator.of(context).pushNamed(Routes.infoSubmit),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(ThuieSpace.lg),
                itemCount: mine.length + (notifier.hasMore ? 1 : 0),
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  if (i >= mine.length) {
                    WidgetsBinding.instance
                        .addPostFrameCallback((_) => notifier.loadMore());
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Center(child: ThuieLoader()),
                    );
                  }
                  final info = mine[i];
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(ThuieRadii.md),
                      border: Border.all(color: c.hairline, width: 0.5),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [CategoryBadge(info.category), const SizedBox(width: 6), StatusBadge(info.status)]),
                      const SizedBox(height: 6),
                      Text(info.title, style: c.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                      if (info.status == ContentStatus.rejected && info.rejectReason != null) ...[
                        const SizedBox(height: 4),
                        Text('${L10n.rejectReasonPrefix}${info.rejectReason}',
                            style: TextStyle(color: c.danger, fontSize: 12)),
                      ],
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: ThuieTextButton(
                          label: L10n.reviseAndResubmit,
                          fontSize: 13,
                          onTap: () => _showMyInfoEditSheet(context, info),
                        ),
                      ),
                    ]),
                  );
                },
              );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.myInfos),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: SegmentedRow<String?>(
            options: _statusOptions,
            selected: notifier.statusFilter,
            label: _statusLabel,
            onSelect: (s) => notifier.setStatus(s),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => notifier.load(refresh: true),
            child: list,
          ),
        ),
      ]),
    );
  }
}

void _showMyInfoEditSheet(BuildContext context, InfoPost info) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _MyInfoEditSheet(info: info),
  );
}

class _MyInfoEditSheet extends StatefulWidget {
  final InfoPost info;
  const _MyInfoEditSheet({required this.info});
  @override
  State<_MyInfoEditSheet> createState() => _MyInfoEditSheetState();
}

class _MyInfoEditSheetState extends State<_MyInfoEditSheet> {
  late String _title = widget.info.title;
  late String _content = widget.info.content;
  String? _error;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.reviseAndResubmit, style: c.titleMedium),
          const SizedBox(height: 6),
          Text(L10n.editRepublishHint, style: TextStyle(fontSize: 12, color: c.muted, height: 1.4)),
          const SizedBox(height: 12),
          FlatField(value: _title, onChanged: (v) => _title = v, label: L10n.titleLabel),
          const SizedBox(height: 10),
          FlatField(value: _content, onChanged: (v) => _content = v, label: L10n.bodyLabel, singleLine: false, maxLines: 5),
          if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(
            label: L10n.submitLabel,
            onTap: _busy ? null : () async {
              setState(() { _busy = true; _error = null; });
              final infos = context.read<InfosNotifier>();
              final mine = context.read<MyInfosNotifier>();
              final messenger = ScaffoldMessenger.of(context);
              final navigator = Navigator.of(context);
              final updated = await infos.update(
                widget.info.id,
                title: _title.trim(),
                content: _content.trim(),
                version: widget.info.version,
              );
              if (!mounted) return;
              if (updated != null) {
                navigator.pop();
                mine.load(refresh: true);
                messenger.showSnackBar(SnackBar(
                    content: Text(L10n.editResubmittedToast), duration: const Duration(seconds: 1)));
              } else {
                final e = infos.error;
                setState(() {
                  _busy = false;
                  _error = e is ApiError ? L10n.describeApiError(e.code) : L10n.errGeneric;
                });
              }
            },
          ),
        ]),
      ),
    );
  }
}
