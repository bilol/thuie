import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_role_strategies_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';

/// §6.17 role-strategy flags (`admin_super`). Renders the server-owned gating
/// toggles for the student / graduate roles from `GET /admin/role-strategies`
/// and writes back through `PATCH /admin/role-strategies`.
class AdminStrategyScreen extends StatefulWidget {
  const AdminStrategyScreen({super.key});
  @override
  State<AdminStrategyScreen> createState() => _AdminStrategyScreenState();
}

class _AdminStrategyScreenState extends State<AdminStrategyScreen> {
  final _notifier = AdminRoleStrategiesNotifier();

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
    return ChangeNotifierProvider<AdminRoleStrategiesNotifier>.value(
      value: _notifier,
      child: const _AdminStrategyBody(),
    );
  }
}

class _AdminStrategyBody extends StatelessWidget {
  const _AdminStrategyBody();
  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AdminRoleStrategiesNotifier>();
    final student = notifier.of(Role.student);
    final graduate = notifier.of(Role.graduate);

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
      AsyncStatus.ready => ListView(children: [
          _StrategyTile(label: L10n.studentCanPost, value: student.canPostForum,
            onChanged: (v) => notifier.update(Role.student, canPostForum: v)),
          _StrategyTile(label: L10n.graduateCanPost, value: graduate.canPostForum,
            onChanged: (v) => notifier.update(Role.graduate, canPostForum: v)),
          _StrategyTile(label: L10n.showAlumniDir, value: student.canViewAlumni, onChanged: (v) {
            notifier.update(Role.student, canViewAlumni: v);
            notifier.update(Role.graduate, canViewAlumni: v);
          }),
          _StrategyTile(label: L10n.showForum, value: student.canViewForum, onChanged: (v) {
            notifier.update(Role.student, canViewForum: v);
            notifier.update(Role.graduate, canViewForum: v);
          }),
        ]),
    };

    return ThuiePage(bar: ThuieBar(title: L10n.openStrategy), body: body);
  }
}

class _StrategyTile extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _StrategyTile({required this.label, required this.value, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 15))),
        Switch(value: value, onChanged: onChanged),
      ]),
    );
  }
}
