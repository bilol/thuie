import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';

enum SealTone { accent, bronze, neutral, ok, warn, danger }

/// Small rounded status/label chip — the base primitive for all badges.
class Seal extends StatelessWidget {
  final String text;
  final SealTone tone;
  final bool filled;

  const Seal({super.key, required this.text, this.tone = SealTone.neutral, this.filled = false});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final fg = switch (tone) {
      SealTone.accent => c.accent,
      SealTone.bronze => c.bronze,
      SealTone.neutral => c.ink2,
      SealTone.ok => c.ok,
      SealTone.warn => c.warn,
      SealTone.danger => c.danger,
    };
    final bg = switch (tone) {
      SealTone.accent => c.accentWeak,
      SealTone.bronze => c.bronzeWeak,
      SealTone.neutral => c.surfaceSunken,
      SealTone.ok => c.okWeak,
      SealTone.warn => c.warnWeak,
      SealTone.danger => c.dangerWeak,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(ThuieRadii.sm),
        color: filled ? fg : bg,
      ),
      child: Text(text, style: TextStyle(
        color: filled ? Colors.white : fg,
        fontSize: 12, height: 1.3, fontWeight: FontWeight.w600,
      )),
    );
  }
}
