import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/thuie_theme.dart';

/// The Thuie button family: filled, outlined, text and icon variants.
class ThuieFilledButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool danger;
  final bool small;
  final Widget? leading;

  const ThuieFilledButton({super.key, required this.label, this.onTap, this.danger = false, this.small = false, this.leading});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return SizedBox(
      width: double.infinity,
      height: small ? 40 : 48,
      child: ElevatedButton(
        onPressed: onTap == null ? null : () {
          HapticFeedback.selectionClick();
          onTap!();
        },
        style: danger ? ElevatedButton.styleFrom(backgroundColor: c.danger) : null,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (leading != null) ...[leading!, const SizedBox(width: 8)],
          // Flexible + single-line ellipsis so a long label shrinks to fit a
          // narrow button (e.g. the two-up Ignore / Delete actions in a card)
          // instead of overflowing the row to the right.
          Flexible(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis)),
        ]),
      ),
    );
  }
}

class ThuieOutlinedButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool small;

  const ThuieOutlinedButton({super.key, required this.label, this.onTap, this.small = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: small ? 40 : 48,
      child: OutlinedButton(
        onPressed: onTap == null ? null : () {
          HapticFeedback.selectionClick();
          onTap!();
        },
        child: Text(label),
      ),
    );
  }
}

class ThuieTextButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final Color? color;
  final double fontSize;
  final FontWeight? fontWeight;

  const ThuieTextButton({super.key, required this.label, this.onTap, this.color, this.fontSize = 15, this.fontWeight});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onTap,
      child: Text(label, style: TextStyle(color: color, fontSize: fontSize, fontWeight: fontWeight)),
    );
  }
}

class ThuieIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final double size;
  final Color? color;
  /// Accessible name for this icon-only button; also surfaced as a Material
  /// tooltip. Required for VoiceOver / TalkBack to announce the control.
  final String? tooltip;

  const ThuieIconButton({super.key, required this.icon, this.onTap, this.size = 22, this.color, this.tooltip});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(icon, size: size, color: color),
      tooltip: tooltip,
      onPressed: onTap,
    );
  }
}
