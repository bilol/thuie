import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/email_service.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class EmailSetupScreen extends StatefulWidget {
  const EmailSetupScreen({super.key});
  @override
  State<EmailSetupScreen> createState() => _EmailSetupScreenState();
}

class _EmailSetupScreenState extends State<EmailSetupScreen> {
  String _email = '';
  String _password = '';
  String _imapHost = '';
  String _smtpHost = '';
  String? _emailError;
  String? _passwordError;
  bool _showAdvanced = false;
  bool _loading = false;
  bool _obscurePassword = true;
  String? _existingEmail;

  @override
  void initState() {
    super.initState();
    // Only the campus mailbox is supported; its IMAP/SMTP hosts are built-in.
    final campus = EmailAccount.forProvider('thuie', 'user@example.com');
    if (campus != null) {
      _imapHost = campus.imapHost;
      _smtpHost = campus.smtpHost;
    }
  }

  bool _checkedExisting = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_checkedExisting) {
      _checkedExisting = true;
      final service = context.read<EmailService>();
      if (service.account != null) {
        _existingEmail = service.account!.email;
        _email = service.account!.email;
      }
    }
  }

  Future<void> _connect() async {
    final email = _email.trim();
    setState(() {
      _emailError = (email.isEmpty || !email.contains('@')) ? L10n.enterValidEmail : null;
      _passwordError = _password.isEmpty ? L10n.enterEmailPassword : null;
    });
    if (_emailError != null || _passwordError != null) return;
    setState(() => _loading = true);

    final account = EmailAccount(
      email: email,
      displayName: '',
      imapHost: _imapHost.trim(),
      smtpHost: _smtpHost.trim(),
    );

    final service = context.read<EmailService>();
    final success = await service.connect(account, _password);

    if (!mounted) return;
    setState(() => _loading = false);

    if (success) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(service.error ?? L10n.connectionFailed), backgroundColor: ThuieTheme.colorsOf(context).danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);

    return ThuiePage(
      bar: ThuieBar(title: L10n.emailSettings),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.campusEmail, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: c.ink)),
          const SizedBox(height: 10),
          FlatField(
            value: _email,
            onChanged: (v) { _email = v; if (_emailError != null) setState(() => _emailError = null); },
            label: L10n.emailAddress,
            placeholder: 'your@email.com',
            leadingIcon: Icon(LucideIcons.mail, size: 16, color: c.muted),
            isError: _emailError != null,
          ),
          if (_emailError != null) ...[
            const SizedBox(height: 6),
            Text(_emailError!, style: TextStyle(fontSize: 12, color: c.danger)),
          ],
          const SizedBox(height: 14),
          FlatField(
            value: _password,
            onChanged: (v) { _password = v; if (_passwordError != null) setState(() => _passwordError = null); },
            label: L10n.passwordAppSpecific,
            secret: _obscurePassword,
            leadingIcon: Icon(LucideIcons.lock, size: 16, color: c.muted),
            trailingIcon: Icon(_obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 16, color: c.muted),
            onTrailingTap: () => setState(() => _obscurePassword = !_obscurePassword),
            isError: _passwordError != null,
          ),
          if (_passwordError != null) ...[
            const SizedBox(height: 6),
            Text(_passwordError!, style: TextStyle(fontSize: 12, color: c.danger)),
          ],
          const SizedBox(height: 16),

          GestureDetector(
            onTap: () => setState(() => _showAdvanced = !_showAdvanced),
            child: Row(children: [
              Icon(_showAdvanced ? LucideIcons.chevronDown : LucideIcons.chevronRight, size: 14, color: c.muted),
              const SizedBox(width: 6),
              Text(L10n.advancedSettings, style: TextStyle(fontSize: 13, color: c.accent, fontWeight: FontWeight.w500)),
            ]),
          ),
          if (_showAdvanced) ...[
            const SizedBox(height: 12),
            FlatField(
              value: _imapHost,
              onChanged: (v) => _imapHost = v,
              label: L10n.imapServer,
            ),
            const SizedBox(height: 12),
            FlatField(
              value: _smtpHost,
              onChanged: (v) => _smtpHost = v,
              label: L10n.smtpServer,
            ),
          ],
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: ThuieFilledButton(
              label: _loading ? L10n.connecting : (_existingEmail != null ? L10n.reconnect : L10n.connectEmail),
              leading: _loading ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: c.onAccent)) : Icon(LucideIcons.logIn, size: 16, color: c.onAccent),
              onTap: _loading ? () {} : _connect,
            ),
          ),
          if (_existingEmail != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: GestureDetector(
                onTap: () {
                  context.read<EmailService>().disconnect();
                  Navigator.of(context).pop();
                },
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: c.dangerWeak,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    border: Border.all(color: c.danger.withAlpha(40), width: 0.5),
                  ),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(LucideIcons.logOut, size: 18, color: c.danger),
                    const SizedBox(width: 8),
                    Text(L10n.disconnectEmail, style: TextStyle(color: c.danger, fontSize: 15, fontWeight: FontWeight.w600)),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(L10n.currentlyConnected(_existingEmail!), textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: c.muted)),
          ],
        ]),
      ),
    );
  }
}
