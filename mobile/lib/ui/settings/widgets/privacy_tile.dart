import 'package:flutter/material.dart';
import '../../theme/thuie_theme.dart';

/// Label + description + switch row shared by privacy & notification settings.
class PrivacyTile extends StatelessWidget {
  final String label, desc;
  final bool value;
  final ValueChanged<bool> onChanged;
  const PrivacyTile({super.key, required this.label, required this.desc, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
          const SizedBox(height: 2),
          Text(desc, style: TextStyle(fontSize: 12, color: c.muted)),
        ])),
        Switch(value: value, onChanged: onChanged),
      ]),
    );
  }
}
