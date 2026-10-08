import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  String _old = '', _new = '', _confirm = '';
  String? _error;
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.changePasswordTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(children: [
          FlatField(value: _old, onChanged: (v) => _old = v, label: L10n.oldPasswordLabel, secret: _obscure,
            trailingIcon: Icon(_obscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
            onTrailingTap: () => setState(() => _obscure = !_obscure)),
          const SizedBox(height: 12),
          FlatField(value: _new, onChanged: (v) => _new = v, label: L10n.newPasswordLabel, secret: _obscure,
            trailingIcon: Icon(_obscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
            onTrailingTap: () => setState(() => _obscure = !_obscure)),
          const SizedBox(height: 12),
          FlatField(value: _confirm, onChanged: (v) => _confirm = v, label: L10n.confirmNewPasswordLabel, secret: _obscure,
            trailingIcon: Icon(_obscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
            onTrailingTap: () => setState(() => _obscure = !_obscure)),
          if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(label: L10n.confirmChangeLabel, onTap: () async {
            if (_new.length < 6) { setState(() => _error = L10n.passwordMin); return; }
            if (_new != _confirm) { setState(() => _error = L10n.passwordMismatch); return; }
            final navigator = Navigator.of(context);
            try {
              await context.read<AuthSession>().changePassword(_old, _new);
              navigator.pop();
            } on ApiError catch (e) {
              if (!mounted) return;
              setState(() => _error = L10n.describeApiError(e.code));
            }
          }),
        ]),
      ),
    );
  }
}
