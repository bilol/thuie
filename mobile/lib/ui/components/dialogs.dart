import 'package:flutter/material.dart';
import '../../l10n.dart';
import '../theme/thuie_theme.dart';

/// Overlay helpers: confirm dialog, generic dialog and bottom sheet.
void showThuieConfirm(BuildContext context, {
  required String title,
  required String body,
  String confirmLabel = '',
  String cancelLabel = '',
  bool destructive = false,
  required VoidCallback onConfirm,
}) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(cancelLabel.isEmpty ? L10n.cancel : cancelLabel)),
        ElevatedButton(
          onPressed: () { Navigator.pop(ctx); onConfirm(); },
          style: destructive ? ElevatedButton.styleFrom(backgroundColor: ThuieTheme.colorsOf(ctx).danger) : null,
          child: Text(confirmLabel.isEmpty ? L10n.confirm : confirmLabel),
        ),
      ],
    ),
  );
}

void showThuieBottomSheet(BuildContext context, {required WidgetBuilder builder}) {
  showModalBottomSheet(
    context: context,
    showDragHandle: true,
    // Let tall content (e.g. a long tag list in the forum filter) scroll instead
    // of being clipped at the default ~9/16-screen cap.
    isScrollControlled: true,
    builder: (ctx) {
      return SafeArea(
        top: false,
        child: SingleChildScrollView(
          // Force the body to span the full width. Every caller hands back a
          // Column(mainAxisSize.min, crossAxisAlignment.start), which would
          // otherwise shrink-wrap horizontally to its widest child (a short tab
          // row / one line of chips) and render the sheet awkwardly narrow.
          child: ConstrainedBox(
            constraints: BoxConstraints(minWidth: MediaQuery.sizeOf(ctx).width),
            child: builder(ctx),
          ),
        ),
      );
    },
  );
}

void showThuieDialog(BuildContext context, {required Widget child}) {
  showDialog(
    context: context,
    builder: (_) => child,
  );
}
