import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';

/// Lightweight typographic helpers used across list/detail sections.
class MetaText extends StatelessWidget {
  final String text;
  const MetaText(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Text(text, style: TextStyle(fontSize: 12, height: 1.3, color: c.muted),
        maxLines: 1, overflow: TextOverflow.ellipsis);
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const SectionTitle({super.key, required this.title, this.trailing});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: c.titleMedium),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class SectionLabel extends StatelessWidget {
  final String text;
  const SectionLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Text(text, style: c.labelSmall);
  }
}
