import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';
import 'haptics.dart';

/// Branded pull-to-refresh wrapper with haptic feedback.
class ThuieRefreshIndicator extends StatelessWidget {
  final Future<void> Function() onRefresh;
  final Widget child;

  const ThuieRefreshIndicator({super.key, required this.onRefresh, required this.child});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return RefreshIndicator(
      onRefresh: () async {
        ThuieHaptics.pullRefresh();
        await onRefresh();
      },
      color: c.accent,
      backgroundColor: c.surface,
      child: child,
    );
  }
}
