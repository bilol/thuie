import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:local_auth/local_auth.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  int _mode = 0;
  String _account = '20230101';
  String _password = 'Demo@12345';
  String? _error;
  bool _obscurePassword = true;

  void _switchMode(int mode) {
    setState(() {
      _mode = mode;
      _error = null;
      final creds = switch (mode) {
        0 => ('20230101', 'Demo@12345'),
        1 => ('13800000210', 'Demo@12345'),
        _ => ('admin@thuie.demo', 'Demo@12345'),
      };
      _account = creds.$1;
      _password = creds.$2;
    });
  }

  bool _busy = false;

  Future<void> _tryLogin() async {
    if (_busy) return;
    setState(() { _busy = true; _error = null; });
    final session = context.read<AuthSession>();
    try {
      await session.login(_account.trim(), _password);
      if (!mounted) return;
      // Admins live inside the tabbed MainScaffold (an extra Admin tab), like
      // every other role.
      Navigator.of(context).pushNamedAndRemoveUntil(Routes.main, (_) => false);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = L10n.describeApiError(e.code));
    } catch (_) {
      if (mounted) setState(() => _error = L10n.errGeneric);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: brandPurple,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 12, offset: const Offset(0, 4))],
                ),
                child: Image.asset('assets/logo.png', width: 220, fit: BoxFit.contain),
              ),
              const SizedBox(height: 16),
              Text(L10n.appName, style: c.displaySmall),
              const SizedBox(height: 4),
              Text(L10n.appTagline, style: TextStyle(color: c.muted, fontSize: 14)),
              const SizedBox(height: 32),
              SegmentedRow<int>(
                options: const [0, 1, 2],
                selected: _mode,
                onSelect: _switchMode,
                label: (v) => switch (v) { 0 => L10n.student, 1 => L10n.graduate, _ => L10n.admin },
              ),
              const SizedBox(height: 24),
              FlatField(
                value: _account, onChanged: (v) { _account = v; if (_error != null) setState(() => _error = null); },
                label: switch (_mode) { 0 => L10n.studentId, 1 => L10n.phoneOrEmail, _ => L10n.adminAccount },
                leadingIcon: Icon(switch (_mode) { 0 => LucideIcons.idCard, 1 => LucideIcons.phone, _ => LucideIcons.shield }, size: 16, color: c.muted),
              ),
              const SizedBox(height: 14),
              FlatField(
                value: _password, onChanged: (v) { _password = v; if (_error != null) setState(() => _error = null); },
                label: L10n.password, secret: _obscurePassword,
                leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted),
                trailingIcon: Icon(_obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
                onTrailingTap: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: c.dangerWeak, borderRadius: BorderRadius.circular(ThuieRadii.md)),
                  child: Row(children: [
                    Icon(LucideIcons.alertCircle, size: 14, color: c.danger),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))),
                  ]),
                ),
              ],
              const SizedBox(height: 24),
              ThuieFilledButton(label: L10n.login, onTap: _busy ? null : _tryLogin),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  ThuieTextButton(label: L10n.forgotPassword, onTap: () => Navigator.of(context).pushNamed(Routes.recover)),
                  ThuieTextButton(label: L10n.register, onTap: () => Navigator.of(context).pushNamed(Routes.register), fontWeight: FontWeight.w600),
                ],
              ),
              const SizedBox(height: 20),
              _BiometricLoginButton(onLogin: (user) {
                Navigator.of(context).pushNamedAndRemoveUntil(Routes.main, (_) => false);
              }),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.surfaceSunken,
                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                ),
                child: Row(children: [
                  Icon(LucideIcons.info, size: 14, color: c.muted),
                  const SizedBox(width: 8),
                  Expanded(child: Text(L10n.demoAccounts, style: TextStyle(fontSize: 11, color: c.muted, height: 1.4))),
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

class _BiometricLoginButton extends StatefulWidget {
  final void Function(User) onLogin;
  const _BiometricLoginButton({required this.onLogin});

  @override
  State<_BiometricLoginButton> createState() => _BiometricLoginButtonState();
}

class _BiometricLoginButtonState extends State<_BiometricLoginButton> {
  final _auth = LocalAuthentication();
  bool _available = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    // Only offer biometric login when the device supports it *and* there is a
    // remembered session to resume — otherwise the button is redundant (a fresh
    // or fully-signed-out login has nothing for `resume()` to adopt).
    final session = context.read<AuthSession>();
    try {
      final available = await _auth.canCheckBiometrics;
      final deviceSupported = await _auth.isDeviceSupported();
      final resumable = await session.hasResumableSession();
      if (mounted) setState(() => _available = available && deviceSupported && resumable);
    } catch (_) {
      if (mounted) setState(() => _available = false);
    }
  }

  Future<void> _authenticate() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final authenticated = await _auth.authenticate(
        localizedReason: L10n.biometricReason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
        ),
      );
      if (authenticated && mounted) {
        ThuieHaptics.success();
        final session = context.read<AuthSession>();
        await session.resume();
        if (!mounted) return;
        final user = session.user;
        if (session.isSignedIn && user != null) {
          widget.onLogin(user);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(L10n.errInvalidCredentials), duration: const Duration(seconds: 2)),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(L10n.biometricFailed), duration: Duration(seconds: 2)),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_available) return const SizedBox.shrink();
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: _loading ? null : _authenticate,
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          gradient: LinearGradient(colors: [c.accent, c.accent.withAlpha(200)]),
          boxShadow: [BoxShadow(color: c.accent.withAlpha(40), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (_loading)
            const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          else ...[
            const Icon(LucideIcons.fingerprint, size: 20, color: Colors.white),
            const SizedBox(width: 8),
            Text(L10n.biometricLogin, style: TextStyle(fontSize: 14, color: Colors.white, fontWeight: FontWeight.w600)),
          ],
        ]),
      ),
    );
  }
}
