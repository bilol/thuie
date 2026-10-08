import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';

/// Tappable padded card wrapper for list/feed entries.
class InfoCard extends StatelessWidget {
  final VoidCallback onTap;
  final Widget child;
  const InfoCard({super.key, required this.onTap, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(ThuieRadii.md),
        // Announce the whole card as a single button to screen readers;
        // InkWell alone doesn't expose a button semantics on its content.
        child: Semantics(
          button: true,
          child: Padding(padding: const EdgeInsets.all(ThuieSpace.lg), child: child),
        ),
      ),
    );
  }
}

class ThuieListTile extends StatelessWidget {
  final Widget? leading;
  final Widget? title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;

  const ThuieListTile({super.key, this.leading, this.title, this.subtitle, this.trailing, this.onTap, this.padding});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: leading,
      title: title,
      subtitle: subtitle,
      trailing: trailing,
      onTap: onTap,
      contentPadding: padding,
    );
  }
}

class ThuieDivider extends StatelessWidget {
  final double indent;
  const ThuieDivider({super.key, this.indent = 0});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: indent),
      child: const Divider(height: 0.5),
    );
  }
}
