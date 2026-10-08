import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../theme/thuie_theme.dart';
import 'buttons.dart';

/// Placeholder widgets for empty, loading and terminal-result states.

/// A compact empty/list-placeholder. Use for "nothing here yet" surfaces.
/// Provide [icon] to make the state contextual instead of the generic inbox,
/// and [actionLabel]/[onAction] to give the user a way forward (CTA).
class EmptyState extends StatelessWidget {
  final String text;
  final IconData? icon;
  final String? actionLabel;
  final VoidCallback? onAction;
  const EmptyState({super.key, required this.text, this.icon, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon ?? LucideIcons.inbox, size: 56, color: c.muted),
            const SizedBox(height: 16),
            Text(text, textAlign: TextAlign.center, style: TextStyle(color: c.muted, fontSize: 15, height: 1.4)),
            if (actionLabel != null) ...[
              const SizedBox(height: 20),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 220),
                child: ThuieFilledButton(label: actionLabel!, onTap: onAction, small: true),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// A full-page terminal result: content that is unavailable, taken down, not
/// found, or blocked by permissions (PRD 6.1 · generic result page). Communicates
/// *what happened* and offers a single way *out*.
class ResultState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;
  const ResultState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: c.accentWeak, shape: BoxShape.circle),
              child: Icon(icon, size: 34, color: c.muted),
            ),
            const SizedBox(height: 20),
            Text(title, textAlign: TextAlign.center, style: c.titleMedium),
            if (message != null) ...[
              const SizedBox(height: 8),
              Text(message!, textAlign: TextAlign.center, style: TextStyle(color: c.muted, fontSize: 14, height: 1.5)),
            ],
            if (actionLabel != null) ...[
              const SizedBox(height: 24),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 240),
                child: ThuieFilledButton(label: actionLabel!, onTap: onAction ?? () => Navigator.of(context).maybePop(), small: true),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ThuieLoader extends StatelessWidget {
  final double size;
  final Color? color;
  const ThuieLoader({super.key, this.size = 28, this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size, height: size,
      child: CircularProgressIndicator(strokeWidth: 3, color: color),
    );
  }
}
