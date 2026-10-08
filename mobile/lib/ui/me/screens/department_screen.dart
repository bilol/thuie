import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../data/notifiers/departments_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Public department registry, served from `GET /departments`
/// (BACKEND.md §6.3). Used as a picker: tapping a row pops its `code`.
class DepartmentScreen extends StatefulWidget {
  const DepartmentScreen({super.key});
  @override
  State<DepartmentScreen> createState() => _DepartmentScreenState();
}

class _DepartmentScreenState extends State<DepartmentScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DepartmentsNotifier>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final notifier = context.watch<DepartmentsNotifier>();
    return ThuiePage(
      bar: ThuieBar(title: L10n.departmentTitle),
      body: switch (notifier.status) {
        AsyncStatus.loading || AsyncStatus.idle =>
          const Center(child: ThuieLoader()),
        AsyncStatus.error => ResultState(
            icon: LucideIcons.wifiOff,
            title: L10n.errNetwork,
            actionLabel: L10n.retry,
            onAction: () => notifier.load(refresh: true),
          ),
        AsyncStatus.ready when notifier.items.isEmpty =>
          EmptyState(text: L10n.noData, icon: LucideIcons.building2),
        AsyncStatus.ready => ListView.separated(
            padding: const EdgeInsets.all(ThuieSpace.lg),
            itemCount: notifier.items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final d = notifier.items[i];
              return GestureDetector(
                onTap: () => Navigator.of(context).pop(d.code),
                child: Container(
                  padding: const EdgeInsets.all(ThuieSpace.lg),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    border: Border.all(color: c.hairline, width: 0.5),
                  ),
                  child: Row(children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: i.isEven ? c.accentWeak : c.okWeak,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(child: Text(d.code, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: i.isEven ? c.accent : c.ok))),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(d.nameFor(english: !L10n.isChinese), style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: c.ink)),
                      if (d.faculty.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(d.faculty, style: TextStyle(fontSize: 12, color: c.muted)),
                      ],
                    ])),
                    Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
                  ]),
                ),
              );
            },
          ),
      },
    );
  }
}
