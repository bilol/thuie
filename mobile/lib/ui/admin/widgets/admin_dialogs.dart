import 'package:flutter/material.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Card-like chrome shared by admin modal dialogs (title + padded body).
class AdminDialogChrome extends StatelessWidget {
  final String title;
  final Widget child;
  const AdminDialogChrome({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final mq = MediaQuery.of(context);
    // Bound the dialog to the viewport minus the keyboard inset and let the
    // body scroll, so tall forms (e.g. Publish Official Info) no longer
    // overflow the bottom when the keyboard is up or the screen is short.
    final maxHeight = (mq.size.height - mq.viewInsets.bottom) * 0.9;
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight, maxWidth: 560),
        // Material ancestor so widgets like Switch (used by the Publish
        // Official Info dialog) find one; showDialog provides none.
        child: Material(
          type: MaterialType.transparency,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 24),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.lg),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.ink)),
              const SizedBox(height: 12),
              Flexible(child: SingleChildScrollView(child: child)),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Generic single-field input dialog (reject reasons, feedback replies…).
void showAdminInputDialog(BuildContext context, {
  String? title,
  String? hint,
  String? confirmLabel,
  required ValueChanged<String> onConfirm,
}) {
  showThuieDialog(context, child: AdminInputDialog(
    title: title ?? L10n.reject,
    hint: hint ?? L10n.inputRejectReason,
    confirmLabel: confirmLabel ?? L10n.confirm,
    onConfirm: onConfirm,
  ));
}

class AdminInputDialog extends StatefulWidget {
  final String title;
  final String hint;
  final String confirmLabel;
  final ValueChanged<String> onConfirm;
  const AdminInputDialog({super.key, required this.title, required this.hint, required this.confirmLabel, required this.onConfirm});
  @override
  State<AdminInputDialog> createState() => _AdminInputDialogState();
}

class _AdminInputDialogState extends State<AdminInputDialog> {
  String _text = '';

  @override
  Widget build(BuildContext context) {
    return AdminDialogChrome(
      title: widget.title,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        FlatField(value: _text, onChanged: (v) => _text = v, placeholder: widget.hint, singleLine: false, maxLines: 3),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: ThuieOutlinedButton(label: L10n.cancel, onTap: () => Navigator.of(context).pop())),
          const SizedBox(width: 10),
          Expanded(child: ThuieFilledButton(label: widget.confirmLabel, onTap: () {
            final text = _text.trim();
            Navigator.of(context).pop();
            widget.onConfirm(text);
          })),
        ]),
      ]),
    );
  }
}
