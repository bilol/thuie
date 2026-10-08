import 'package:flutter/material.dart';
import '../../theme/thuie_theme.dart';

/// Compact statistic tile used on the admin home dashboard and analytics screen.
class StatCard extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData? icon;
  const StatCard({super.key, required this.label, required this.value, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      alignment: Alignment.centerLeft,
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(ThuieRadii.md),
        border: Border.all(color: color.withAlpha(40), width: 0.5),
      ),
      // Horizontal layout keeps the content short so it never overflows the
      // fixed-height grid cell, while staying compact.
      child: Row(children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: color.withAlpha(150)),
          const SizedBox(width: 10),
        ],
        Expanded(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 2),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: color.withAlpha(180))),
        ])),
      ]),
    );
  }
}
