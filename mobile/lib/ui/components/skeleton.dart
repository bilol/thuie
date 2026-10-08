import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';

/// Shimmering skeleton placeholders for loading states.
class SkeletonBox extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;

  const SkeletonBox({super.key, required this.width, required this.height, this.borderRadius = 8});

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        final t = _ctrl.value;
        final base = c.surfaceSunken;
        final highlight = c.surface;
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(-1 + 3 * t, 0),
              end: Alignment(-1 + 3 * t + 0.5, 0),
              colors: [base, highlight, base],
            ),
          ),
        );
      },
    );
  }
}

class SkeletonList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;
  final bool showAvatar;
  final bool showSubtitle;

  const SkeletonList({super.key, this.itemCount = 5, this.itemHeight = 72, this.showAvatar = true, this.showSubtitle = true});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(itemCount, (i) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: _SkeletonItem(showAvatar: showAvatar, showSubtitle: showSubtitle),
      )),
    );
  }
}

class _SkeletonItem extends StatelessWidget {
  final bool showAvatar;
  final bool showSubtitle;
  const _SkeletonItem({required this.showAvatar, required this.showSubtitle});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      if (showAvatar) ...[
        const SkeletonBox(width: 44, height: 44, borderRadius: 22),
        const SizedBox(width: 12),
      ],
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SkeletonBox(width: double.infinity, height: 14),
        if (showSubtitle) ...[const SizedBox(height: 8), SkeletonBox(width: MediaQuery.of(context).size.width * 0.4, height: 12)],
      ])),
    ]);
  }
}

class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Container(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        decoration: BoxDecoration(
          color: ThuieTheme.colorsOf(context).surface,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          border: Border.all(color: ThuieTheme.colorsOf(context).hairline, width: 0.5),
        ),
        child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SkeletonBox(width: double.infinity, height: 16),
          SizedBox(height: 10),
          SkeletonBox(width: double.infinity, height: 12),
          SizedBox(height: 6),
          SkeletonBox(width: 180, height: 12),
        ]),
      ),
    );
  }
}
