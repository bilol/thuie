import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../theme/thuie_theme.dart';

/// Shared "card menu" group used by Personal Centre and Settings.
class SectionHeader extends StatelessWidget {
  final String title;
  const SectionHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.muted)),
    );
  }
}

class CardMenu extends StatelessWidget {
  final List<CardMenuItem> items;
  const CardMenu({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          border: Border.all(color: c.hairline, width: 0.5),
        ),
        child: Column(children: [
          for (int i = 0; i < items.length; i++) ...[
            items[i],
            if (i < items.length - 1) Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Divider(height: 0.5, color: c.hairline),
            ),
          ],
        ]),
      ),
    );
  }
}

class CardMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final Color color;
  final VoidCallback onTap;
  /// Optional custom trailing widget (e.g. a [Switch]); defaults to the chevron.
  final Widget? trailing;
  const CardMenuItem({super.key, required this.icon, required this.label, required this.color, required this.onTap, this.subtitle, this.trailing});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(children: [
          Container(
            width: 34, height: 34,
            decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(ThuieRadii.md)),
            child: Icon(icon, size: 17, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: TextStyle(fontSize: 15, color: c.ink))),
          if (subtitle != null) ...[
            const SizedBox(width: 8),
            Text(subtitle!, style: TextStyle(fontSize: 12, color: c.muted)),
          ],
          const SizedBox(width: 6),
          trailing ?? Icon(LucideIcons.chevronRight, size: 16, color: c.hairline),
        ]),
      ),
    );
  }
}
