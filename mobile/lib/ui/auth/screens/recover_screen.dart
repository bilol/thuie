import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class RecoverScreen extends StatefulWidget {
  const RecoverScreen({super.key});
  @override
  State<RecoverScreen> createState() => _RecoverScreenState();
}

class _RecoverScreenState extends State<RecoverScreen> {
  // Two-step flow: verify a code first, only then set a new password.
  int _step = 0;
  String _account = '', _code = '', _newPassword = '', _confirm = '';
  String? _message;
  bool _ok = false;
  bool _obscure = true;
  bool _codeSent = false;
  int _countdown = 0;

  bool _busy = false;

  Future<void> _sendCode() async {
    if (_account.trim().isEmpty) {
      setState(() { _ok = false; _message = L10n.enterAccount; });
      return;
    }
    final session = context.read<AuthSession>();
    try {
      await session.forgotPassword(_account.trim());
      if (!mounted) return;
      setState(() { _codeSent = true; _countdown = 60; _ok = true; _message = '${L10n.otpSentTo} ${_account.trim()}'; });
      _startCountdown();
    } on ApiError catch (e) {
      if (mounted) setState(() { _ok = false; _message = L10n.describeApiError(e.code); });
    } catch (_) {
      if (mounted) setState(() { _ok = false; _message = L10n.errGeneric; });
    }
  }

  void _startCountdown() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      if (_countdown <= 1) {
        setState(() => _countdown = 0);
        return false;
      }
      setState(() => _countdown--);
      return true;
    });
  }

  void _verify() {
    // The code is validated by the server on reset; advance once one is entered.
    if (_code.trim().length < 4) { setState(() { _ok = false; _message = L10n.enterCode; }); return; }
    setState(() { _ok = true; _message = null; _step = 1; });
  }

  Future<void> _reset() async {
    if (_newPassword.length < 6) { setState(() { _ok = false; _message = L10n.passwordMin; }); return; }
    if (_newPassword != _confirm) { setState(() { _ok = false; _message = L10n.passwordMismatch; }); return; }
    if (_busy) return;
    setState(() { _busy = true; _message = null; });
    final session = context.read<AuthSession>();
    try {
      await session.resetPassword(identifier: _account.trim(), code: _code.trim(), newPassword: _newPassword);
      if (!mounted) return;
      setState(() { _busy = false; _ok = true; _message = L10n.passwordReset; });
    } on ApiError catch (e) {
      if (mounted) setState(() { _busy = false; _ok = false; _message = L10n.describeApiError(e.code); });
    } catch (_) {
      if (mounted) setState(() { _busy = false; _ok = false; _message = L10n.errGeneric; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.resetPassword),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: c.accentWeak, borderRadius: BorderRadius.circular(ThuieRadii.md)),
                child: Row(children: [
                  Icon(LucideIcons.info, size: 16, color: c.accent),
                  const SizedBox(width: 10),
                  Expanded(child: Text(L10n.recoverNote, style: TextStyle(fontSize: 13, color: c.ink2, height: 1.4))),
                ]),
              ),
              const SizedBox(height: 16),
              _StepIndicator(current: _step),
              const SizedBox(height: 20),
              if (_step == 0) ...[
                FlatField(value: _account, onChanged: (v) { _account = v; _message = null; }, label: L10n.phoneOrEmail,
                  leadingIcon: Icon(LucideIcons.user, size: 16, color: c.muted)),
                const SizedBox(height: 12),
                FlatField(value: _code, onChanged: (v) { _code = v; _message = null; }, label: L10n.verificationCode, placeholder: L10n.enterOtp,
                  leadingIcon: Icon(LucideIcons.key, size: 16, color: c.muted)),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: ThuieOutlinedButton(
                    label: _countdown > 0 ? '${_countdown}s' : (_codeSent ? L10n.resendCode : L10n.getCode),
                    onTap: _countdown > 0 ? null : _sendCode,
                  )),
                  const SizedBox(width: 12),
                  Expanded(child: ThuieFilledButton(label: L10n.verify, onTap: _verify)),
                ]),
              ] else ...[
                FlatField(value: _newPassword, onChanged: (v) { _newPassword = v; _message = null; }, label: L10n.newPassword, secret: _obscure,
                  leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted),
                  trailingIcon: Icon(_obscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
                  onTrailingTap: () => setState(() => _obscure = !_obscure)),
                const SizedBox(height: 12),
                FlatField(value: _confirm, onChanged: (v) { _confirm = v; _message = null; }, label: L10n.confirmNewPassword, secret: _obscure,
                  leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted)),
                const SizedBox(height: 24),
                ThuieFilledButton(label: L10n.resetPassword, onTap: _busy ? null : _reset),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.center,
                  child: ThuieTextButton(
                    label: L10n.back, fontSize: 13,
                    onTap: () => setState(() { _step = 0; _message = null; }),
                  ),
                ),
              ],
              if (_message != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _ok ? c.okWeak : c.dangerWeak,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                  ),
                  child: Row(children: [
                    Icon(_ok ? LucideIcons.checkCircle : LucideIcons.alertCircle, size: 14, color: _ok ? c.ok : c.danger),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_message!, style: TextStyle(color: _ok ? c.ok : c.danger, fontSize: 13))),
                  ]),
                ),
              ],
              const SizedBox(height: 20),
              if (_step == 0) Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.surfaceSunken,
                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                ),
                child: Row(children: [
                  Icon(LucideIcons.info, size: 14, color: c.muted),
                  const SizedBox(width: 8),
                  Expanded(child: Text(L10n.otpDemoHint, style: TextStyle(fontSize: 11, color: c.muted, height: 1.4))),
                ]),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact "Step 1 · 2" progress pill for the reset-password flow.
class _StepIndicator extends StatelessWidget {
  final int current;
  const _StepIndicator({required this.current});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    Widget dot(int index, String label) {
      final active = current >= index;
      return Row(children: [
        Container(
          width: 20, height: 20,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: active ? c.accent : c.surfaceSunken,
          ),
          child: Center(child: Text('${index + 1}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: active ? c.onAccent : c.muted))),
        ),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12, color: active ? c.ink : c.muted)),
      ]);
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        dot(0, L10n.verificationCode),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Icon(LucideIcons.chevronRight, size: 14, color: c.muted)),
        dot(1, L10n.newPassword),
      ],
    );
  }
}
