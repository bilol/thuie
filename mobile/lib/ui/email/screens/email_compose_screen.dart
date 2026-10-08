import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/email_service.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/compose_args.dart';

class EmailComposeScreen extends StatefulWidget {
  const EmailComposeScreen({super.key});
  @override
  State<EmailComposeScreen> createState() => _EmailComposeScreenState();
}

class _EmailComposeScreenState extends State<EmailComposeScreen> {
  final _toCtrl = TextEditingController();
  final _ccCtrl = TextEditingController();
  final _bccCtrl = TextEditingController();
  final _subjectCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  bool _showCc = false;
  bool _sending = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is ComposeArgs) {
      if (args.to != null && _toCtrl.text.isEmpty) _toCtrl.text = args.to!;
      if (args.subject != null && _subjectCtrl.text.isEmpty) _subjectCtrl.text = args.subject!;
      if (args.body != null && _bodyCtrl.text.isEmpty) _bodyCtrl.text = args.body!;
      if (args.to != null || args.subject != null) _showCc = true;
    }
  }

  @override
  void dispose() {
    _toCtrl.dispose();
    _ccCtrl.dispose();
    _bccCtrl.dispose();
    _subjectCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_toCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.fillRecipient)));
      return;
    }
    if (_subjectCtrl.text.trim().isEmpty && _bodyCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.fillSubjectOrBody)));
      return;
    }

    setState(() => _sending = true);
    final service = context.read<EmailService>();
    final success = await service.sendMessage(
      to: _toCtrl.text.trim(),
      subject: _subjectCtrl.text.trim(),
      body: _bodyCtrl.text.trim(),
      cc: _ccCtrl.text.trim().isNotEmpty ? _ccCtrl.text.trim() : null,
      bcc: _bccCtrl.text.trim().isNotEmpty ? _bccCtrl.text.trim() : null,
    );

    if (!mounted) return;
    setState(() => _sending = false);

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.emailSent), duration: Duration(seconds: 2)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(service.error ?? L10n.sendFailed),
        backgroundColor: ThuieTheme.colorsOf(context).danger,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final service = context.watch<EmailService>();
    final fromEmail = service.account?.email ?? '';

    return ThuiePage(
      bar: ThuieBar(title: L10n.composeEmail, actions: [
        ThuieIconButton(icon: LucideIcons.send, size: 20, color: c.accent, onTap: _sending ? () {} : _send),
      ]),
      body: SingleChildScrollView(padding: const EdgeInsets.all(ThuieSpace.lg), child: Column(children: [
        Container(
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Column(children: [
            _FieldRow(label: L10n.fromLabel, child: Text(fromEmail, style: TextStyle(fontSize: 14, color: c.muted))),
            Divider(height: 0.5, color: c.hairline),
            _FieldRow(label: L10n.toLabel, child: TextField(
              controller: _toCtrl,
              style: TextStyle(fontSize: 14, color: c.ink),
              decoration: InputDecoration(hintText: L10n.enterEmailAddr, hintStyle: TextStyle(color: c.muted.withAlpha(150), fontSize: 14), border: InputBorder.none, isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 14)),
            )),
            if (_showCc) ...[
              Divider(height: 0.5, color: c.hairline),
              _FieldRow(label: L10n.ccLabel, child: TextField(
                controller: _ccCtrl,
                style: TextStyle(fontSize: 14, color: c.ink),
                decoration: InputDecoration(hintText: L10n.ccLabel, hintStyle: TextStyle(color: c.muted.withAlpha(150), fontSize: 14), border: InputBorder.none, isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 14)),
              )),
              Divider(height: 0.5, color: c.hairline),
              _FieldRow(label: L10n.bccLabel, child: TextField(
                controller: _bccCtrl,
                style: TextStyle(fontSize: 14, color: c.ink),
                decoration: InputDecoration(hintText: L10n.bccLabel, hintStyle: TextStyle(color: c.muted.withAlpha(150), fontSize: 14), border: InputBorder.none, isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 14)),
              )),
            ],
            if (!_showCc) Divider(height: 0.5, color: c.hairline),
            if (!_showCc) GestureDetector(
              onTap: () => setState(() => _showCc = true),
              child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), child: Row(children: [
                Text(L10n.addCcBcc, style: TextStyle(fontSize: 12, color: c.accent)),
              ])),
            ),
            Divider(height: 0.5, color: c.hairline),
            _FieldRow(label: L10n.subjectLabel, child: TextField(
              controller: _subjectCtrl,
              style: TextStyle(fontSize: 14, color: c.ink),
              decoration: InputDecoration(hintText: L10n.emailSubject, hintStyle: TextStyle(color: c.muted.withAlpha(150), fontSize: 14), border: InputBorder.none, isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 14)),
            )),
          ]),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 300),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: TextField(
            controller: _bodyCtrl,
            style: TextStyle(fontSize: 14, color: c.ink, height: 1.6),
            maxLines: null,
            decoration: InputDecoration(hintText: L10n.writeEmailHint, hintStyle: TextStyle(color: c.muted.withAlpha(150), fontSize: 14), border: InputBorder.none, isDense: true),
          ),
        ),
        const SizedBox(height: 16),
        Row(children: [
          GestureDetector(
            onTap: () {},
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.circular(ThuieRadii.md),
                border: Border.all(color: c.hairline, width: 0.5),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(LucideIcons.paperclip, size: 16, color: c.muted),
                const SizedBox(width: 6),
                Text(L10n.attachment, style: TextStyle(fontSize: 13, color: c.muted)),
              ]),
            ),
          ),
        ]),
      ])),
    );
  }
}

class _FieldRow extends StatelessWidget {
  final String label;
  final Widget child;
  const _FieldRow({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(padding: const EdgeInsets.symmetric(horizontal: 14), child: Row(children: [
      SizedBox(width: 56, child: Text(label, style: TextStyle(fontSize: 13, color: c.muted))),
      Expanded(child: child),
    ]));
  }
}
