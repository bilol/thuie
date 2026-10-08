import 'package:flutter/material.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_users_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 user detail. The full [User] row is handed over from the directory
/// (there is no single-user `GET`); student→graduate conversion writes through
/// `POST /admin/users/:id/convert`. On success this pops with `true` so the
/// caller refreshes its list.
class AdminUserDetailScreen extends StatefulWidget {
  final User user;
  const AdminUserDetailScreen(this.user, {super.key});

  @override
  State<AdminUserDetailScreen> createState() => _AdminUserDetailScreenState();
}

class _AdminUserDetailScreenState extends State<AdminUserDetailScreen> {
  final _notifier = AdminUsersNotifier();
  bool _busy = false;

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  Future<void> _convert() async {
    if (_busy) return;
    setState(() => _busy = true);
    final ok = await _notifier.convert(widget.user.id);
    if (!mounted) return;
    setState(() => _busy = false);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    if (ok) {
      navigator.pop(true);
      messenger.showSnackBar(SnackBar(content: Text(L10n.convertSuccess)));
    } else {
      messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(_notifier.error?.code))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final user = widget.user;

    return ThuiePage(
      bar: ThuieBar(title: L10n.userDetailTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Column(children: [
              Avatar(name: user.name, seed: user.avatarSeed, size: 64),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(user.name, style: c.titleMedium),
                const SizedBox(width: 8),
                RoleBadge(user.role),
              ]),
              const SizedBox(height: 4),
              MetaText(user.department),
              const SizedBox(height: 16),
              const ThuieDivider(),
              const SizedBox(height: 12),
              _UserDetailRow(label: L10n.studentIdLabel, value: user.studentId ?? user.phone ?? user.email ?? '-'),
              _UserDetailRow(label: L10n.departmentLabel, value: user.department),
              _UserDetailRow(label: L10n.registeredAt, value: Fmt.relative(user.createdAt)),
            ]),
          ),
          const SizedBox(height: 20),
          if (user.role == Role.student)
            ThuieFilledButton(
              label: _busy ? L10n.converting : L10n.convertToGraduate,
              onTap: _busy ? null : _convert,
            ),
        ]),
      ),
    );
  }
}

class _UserDetailRow extends StatelessWidget {
  final String label, value;
  const _UserDetailRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Text(label, style: TextStyle(fontSize: 13, color: c.muted)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 13)),
      ]),
    );
  }
}
