import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int _step = 0;

  @override
  Widget build(BuildContext context) {
    if (_step == 0) {
      final c = ThuieTheme.colorsOf(context);
      return ThuiePage(
        bar: ThuieBar(title: L10n.register, showBack: false),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 32),
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: c.accentWeak,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(LucideIcons.userPlus, size: 28, color: c.accent),
                ),
                const SizedBox(height: 20),
                Text(L10n.selectIdentity, style: c.titleLarge),
                const SizedBox(height: 8),
                Text(L10n.identityNote, style: TextStyle(color: c.muted, fontSize: 13), textAlign: TextAlign.center),
                const SizedBox(height: 32),
                _IdentityCard(
                  icon: LucideIcons.graduationCap,
                  title: L10n.iAmStudent,
                  desc: L10n.studentDesc,
                  color: c.accent,
                  onTap: () => setState(() { _step = 1; }),
                ),
                const SizedBox(height: 14),
                _IdentityCard(
                  icon: LucideIcons.briefcase,
                  title: L10n.iAmGraduate,
                  desc: L10n.graduateDesc,
                  color: c.ok,
                  onTap: () => setState(() { _step = 2; }),
                ),
              ],
            ),
          ),
        ),
      );
    }
    return _step == 1 ? _StudentForm(onBack: () => setState(() { _step = 0; }))
                      : _GraduateForm(onBack: () => setState(() { _step = 0; }));
  }
}

class _IdentityCard extends StatelessWidget {
  final IconData icon;
  final String title, desc;
  final Color color;
  final VoidCallback onTap;
  const _IdentityCard({required this.icon, required this.title, required this.desc, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          border: Border.all(color: c.hairline, width: 0.5),
          borderRadius: BorderRadius.circular(ThuieRadii.lg),
          color: c.surface,
        ),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 22, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: c.ink)),
            const SizedBox(height: 4),
            Text(desc, style: TextStyle(fontSize: 12, color: c.muted, height: 1.4)),
          ])),
          Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
        ]),
      ),
    );
  }
}

class _TermsConsent extends StatelessWidget {
  final bool value;
  final ValueChanged<bool?> onChanged;
  const _TermsConsent({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 24, height: 24,
          child: Checkbox(
            value: value,
            onChanged: onChanged,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: GestureDetector(
            onTap: () => onChanged(!value),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(L10n.agreeTermsPrefix, style: TextStyle(fontSize: 13, color: c.muted)),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pushNamed(Routes.terms),
                    child: Text(L10n.termsOfService,
                        style: TextStyle(fontSize: 13, color: c.accent, fontWeight: FontWeight.w500)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _StudentForm extends StatefulWidget {
  final VoidCallback onBack;
  const _StudentForm({required this.onBack});
  @override
  State<_StudentForm> createState() => _StudentFormState();
}

class _StudentFormState extends State<_StudentForm> {
  String _studentId = '', _name = '', _email = '', _password = '', _confirm = '';
  String? _error;
  bool _obscure = true;
  bool _agreed = false;
  bool _busy = false;

  Future<void> _submit() async {
    if (!_agreed) { setState(() => _error = L10n.agreeTermsRequired); return; }
    if (_studentId.trim().isEmpty || _name.trim().isEmpty) { setState(() => _error = L10n.fillComplete); return; }
    if (_email.trim().isEmpty) { setState(() => _error = L10n.fillComplete); return; }
    if (_password.length < 6) { setState(() => _error = L10n.passwordMin); return; }
    if (_password != _confirm) { setState(() => _error = L10n.passwordMismatch); return; }
    if (_busy) return;
    setState(() { _busy = true; _error = null; });
    final session = context.read<AuthSession>();
    final email = _email.trim();
    try {
      await session.register(
        name: _name.trim(),
        role: 'student',
        studentId: _studentId.trim(),
        email: email,
        password: _password,
      );
      if (!mounted) return;
      // New student accounts start `unverified`; continue on the OTP step.
      Navigator.of(context).pushNamed(Routes.otp, arguments: (
        email,
        'register_verify',
        () => Navigator.of(context).pushNamedAndRemoveUntil(Routes.main, (_) => false),
      ));
    } on ApiError catch (e) {
      if (mounted) setState(() { _busy = false; _error = L10n.describeApiError(e.code); });
    } catch (_) {
      if (mounted) setState(() { _busy = false; _error = L10n.errGeneric; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.studentRegister),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const SizedBox(height: 16),
              FlatField(value: _studentId, onChanged: (v) => _studentId = v, label: L10n.studentId, placeholder: L10n.enterStudentId,
                leadingIcon: Icon(LucideIcons.idCard, size: 16, color: c.muted)),
              const SizedBox(height: 12),
              FlatField(value: _name, onChanged: (v) { _name = v; if (_error != null) setState(() => _error = null); }, label: L10n.realName, placeholder: L10n.enterRealName,
                leadingIcon: Icon(LucideIcons.user, size: 16, color: c.muted)),
              const SizedBox(height: 12),
              FlatField(value: _email, onChanged: (v) { _email = v; if (_error != null) setState(() => _error = null); }, label: L10n.email, placeholder: L10n.enterEmailAddr,
                leadingIcon: Icon(LucideIcons.mail, size: 16, color: c.muted)),
              const SizedBox(height: 12),
              FlatField(value: _password, onChanged: (v) => _password = v, label: L10n.password, placeholder: L10n.setPassword, secret: _obscure,
                leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted),
                trailingIcon: Icon(_obscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
                onTrailingTap: () => setState(() => _obscure = !_obscure)),
              const SizedBox(height: 12),
              FlatField(value: _confirm, onChanged: (v) => _confirm = v, label: L10n.confirmPassword, placeholder: L10n.reenterPassword, secret: _obscure,
                leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted)),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: c.dangerWeak, borderRadius: BorderRadius.circular(ThuieRadii.md)),
                  child: Text(_error!, style: TextStyle(color: c.danger, fontSize: 13)),
                ),
              ],
              const SizedBox(height: 20),
              _TermsConsent(value: _agreed, onChanged: (v) => setState(() => _agreed = v ?? false)),
              const SizedBox(height: 24),
              ThuieFilledButton(label: L10n.register, onTap: _busy ? null : _submit),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _GraduateForm extends StatefulWidget {
  final VoidCallback onBack;
  const _GraduateForm({required this.onBack});
  @override
  State<_GraduateForm> createState() => _GraduateFormState();
}

class _GraduateFormState extends State<_GraduateForm> {
  String _account = '', _name = '', _password = '', _confirm = '', _code = '';
  bool _codeSent = false;
  int _countdown = 0;
  bool _agreed = false;
  String? _error;
  bool _obscure = true;

  bool _busy = false;

  Future<void> _sendCode() async {
    if (_account.trim().isEmpty) { setState(() => _error = L10n.enterAccount); return; }
    final session = context.read<AuthSession>();
    setState(() => _error = null);
    try {
      await session.resendOtp(_account.trim(), 'register_verify');
      if (!mounted) return;
      setState(() { _codeSent = true; _countdown = 60; });
      _startCountdown();
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = L10n.describeApiError(e.code));
    } catch (_) {
      if (mounted) setState(() => _error = L10n.errGeneric);
    }
  }

  Future<void> _submit() async {
    if (!_agreed) { setState(() => _error = L10n.agreeTermsRequired); return; }
    if (_account.trim().isEmpty || !_codeSent) { setState(() => _error = L10n.getCodeFirst); return; }
    if (_name.trim().isEmpty) { setState(() => _error = L10n.fillComplete); return; }
    if (_password.length < 6) { setState(() => _error = L10n.passwordMin); return; }
    if (_password != _confirm) { setState(() => _error = L10n.passwordMismatch); return; }
    if (_busy) return;
    setState(() { _busy = true; _error = null; });
    final session = context.read<AuthSession>();
    final account = _account.trim();
    final isEmail = account.contains('@');
    try {
      await session.register(
        name: _name.trim(),
        role: 'graduate',
        email: isEmail ? account : null,
        phone: isEmail ? null : account,
        password: _password,
      );
      if (!mounted) return;
      // Graduate signup verifies inline via the OTP supplied above; confirm it.
      await session.verifyOtp(identifier: account, purpose: 'register_verify', code: _code.trim());
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil(Routes.main, (_) => false);
    } on ApiError catch (e) {
      if (mounted) setState(() { _busy = false; _error = L10n.describeApiError(e.code); });
    } catch (_) {
      if (mounted) setState(() { _busy = false; _error = L10n.errGeneric; });
    }
  }

  void _startCountdown() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      if (_countdown <= 1) { setState(() => _countdown = 0); return false; }
      setState(() => _countdown--);
      return true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.graduateRegister),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const SizedBox(height: 16),
              FlatField(value: _account, onChanged: (v) => _account = v, label: L10n.phoneOrEmail,
                leadingIcon: Icon(LucideIcons.phone, size: 16, color: c.muted)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: FlatField(value: _code, onChanged: (v) => _code = v, label: L10n.verificationCode,
                  leadingIcon: Icon(LucideIcons.key, size: 16, color: c.muted))),
                const SizedBox(width: 12),
                Padding(
                  padding: const EdgeInsets.only(top: 22),
                  child: ThuieTextButton(
                    label: _countdown > 0
                        ? L10n.resendIn(_countdown)
                        : (_codeSent ? L10n.resendCode : L10n.getCode),
                    onTap: _countdown > 0 ? null : _sendCode,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              FlatField(value: _name, onChanged: (v) => _name = v, label: L10n.realName, placeholder: L10n.enterRealName,
                leadingIcon: Icon(LucideIcons.user, size: 16, color: c.muted)),
              const SizedBox(height: 12),
              FlatField(value: _password, onChanged: (v) => _password = v, label: L10n.password, secret: _obscure,
                leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted),
                trailingIcon: Icon(_obscure ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
                onTrailingTap: () => setState(() => _obscure = !_obscure)),
              const SizedBox(height: 12),
              FlatField(value: _confirm, onChanged: (v) => _confirm = v, label: L10n.confirmPassword, secret: _obscure,
                leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted)),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: c.dangerWeak, borderRadius: BorderRadius.circular(ThuieRadii.md)),
                  child: Text(_error!, style: TextStyle(color: c.danger, fontSize: 13)),
                ),
              ],
              const SizedBox(height: 20),
              _TermsConsent(value: _agreed, onChanged: (v) => setState(() => _agreed = v ?? false)),
              const SizedBox(height: 24),
              ThuieFilledButton(label: L10n.register, onTap: _busy ? null : _submit),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
