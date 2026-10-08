import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class OtpVerificationScreen extends StatefulWidget {
  final String account;
  final String purpose;
  final VoidCallback onVerified;
  const OtpVerificationScreen({super.key, required this.account, this.purpose = 'register_verify', required this.onVerified});

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  String _code = '';
  String? _error;
  bool _codeSent = false;
  int _countdown = 0;
  bool _busy = false;

  Future<void> _sendCode() async {
    final session = context.read<AuthSession>();
    setState(() => _error = null);
    try {
      await session.resendOtp(widget.account, widget.purpose);
      if (!mounted) return;
      setState(() { _codeSent = true; _countdown = 60; });
      _startCountdown();
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = L10n.describeApiError(e.code));
    } catch (_) {
      if (mounted) setState(() => _error = L10n.errGeneric);
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

  Future<void> _verify() async {
    if (_code.trim().length < 4) { setState(() => _error = L10n.enterCode); return; }
    if (_busy) return;
    setState(() { _busy = true; _error = null; });
    final session = context.read<AuthSession>();
    try {
      await session.verifyOtp(identifier: widget.account, purpose: widget.purpose, code: _code.trim());
      if (!mounted) return;
      widget.onVerified();
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
      bar: ThuieBar(title: L10n.phoneVerify),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const SizedBox(height: 24),
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  color: c.accentWeak,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(LucideIcons.smartphone, size: 32, color: c.accent),
              ),
              const SizedBox(height: 16),
              Text(L10n.phoneVerify, style: c.titleLarge),
              const SizedBox(height: 8),
              Text('${L10n.otpSentTo} ${widget.account}', style: TextStyle(color: c.muted, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 32),
              FlatField(
                value: _code, onChanged: (v) { _code = v; if (_error != null) setState(() => _error = null); },
                label: L10n.verificationCode, placeholder: L10n.enterOtp,
                leadingIcon: Icon(LucideIcons.key, size: 16, color: c.muted),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: ThuieOutlinedButton(
                  label: _countdown > 0 ? '${_countdown}s' : (_codeSent ? L10n.resendCode : L10n.getCode),
                  onTap: _countdown > 0 ? null : _sendCode,
                )),
                const SizedBox(width: 12),
                Expanded(child: ThuieFilledButton(label: L10n.verify, onTap: _busy ? null : _verify)),
              ]),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: c.dangerWeak, borderRadius: BorderRadius.circular(ThuieRadii.md)),
                  child: Row(children: [
                    Icon(LucideIcons.alertCircle, size: 14, color: c.danger),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))),
                  ]),
                ),
              ],
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
