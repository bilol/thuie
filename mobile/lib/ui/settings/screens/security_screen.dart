import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class SecurityScreen extends StatelessWidget {
  const SecurityScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.accountSecurityTitle),
      body: ListView(children: [
        ThuieListTile(
          title: Text(L10n.changePasswordTitle),
          trailing: const Icon(LucideIcons.chevronRight),
          onTap: () => Navigator.of(context).pushNamed(Routes.changePassword),
        ),
        ThuieListTile(
          title: Text(L10n.loginDevices),
          subtitle: Text(L10n.devicesDesc,
              style: TextStyle(fontSize: 12, color: ThuieTheme.colorsOf(context).muted)),
          trailing: const Icon(LucideIcons.chevronRight),
          onTap: () => Navigator.of(context).pushNamed(Routes.sessions),
        ),
        const SizedBox(height: 24),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: GestureDetector(
            onTap: () => showThuieConfirm(context,
              title: L10n.deleteAccount,
              body: L10n.deleteAccountConfirm,
              confirmLabel: L10n.delete,
              destructive: true,
              onConfirm: () async {
                final navigator = Navigator.of(context);
                final messenger = ScaffoldMessenger.of(context);
                try {
                  await context.read<AuthSession>().deleteAccount();
                } on ApiError catch (e) {
                  // Server rejected the delete — keep the user signed in.
                  messenger.showSnackBar(SnackBar(
                    content: Text(L10n.actionError(e.code)),
                    duration: const Duration(seconds: 2),
                  ));
                  return;
                }
                navigator.pushNamedAndRemoveUntil(Routes.login, (_) => false);
              },
            ),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: c.dangerWeak,
                borderRadius: BorderRadius.circular(ThuieRadii.md),
                border: Border.all(color: c.danger.withAlpha(40), width: 0.5),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(LucideIcons.trash2, size: 18, color: c.danger),
                const SizedBox(width: 8),
                Text(L10n.deleteAccount, style: TextStyle(color: c.danger, fontSize: 15, fontWeight: FontWeight.w600)),
              ]),
            ),
          ),
        ),
      ]),
    );
  }
}
