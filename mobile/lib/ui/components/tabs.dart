import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/thuie_theme.dart';

/// Tab and segmented-selection controls.
class SelectTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const SelectTab({super.key, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Tab(
      child: Text(label, style: TextStyle(
        color: selected ? c.accent : c.muted,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
      )),
    );
  }
}

class SelectTabs extends StatelessWidget {
  final List<String> options;
  final int selectedIndex;
  final ValueChanged<int> onSelect;

  const SelectTabs({super.key, required this.options, required this.selectedIndex, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Row(
      children: [
        for (int i = 0; i < options.length; i++)
          GestureDetector(
            onTap: () => onSelect(i),
            child: Padding(
              padding: const EdgeInsets.only(right: 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    options[i],
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: i == selectedIndex ? FontWeight.w600 : FontWeight.w400,
                      color: i == selectedIndex ? c.accent : c.muted,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 2,
                    width: 20,
                    decoration: BoxDecoration(
                      color: i == selectedIndex ? c.accent : Colors.transparent,
                      borderRadius: BorderRadius.circular(1),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class SegmentedRow<T> extends StatelessWidget {
  final List<T> options;
  final T selected;
  final ValueChanged<T> onSelect;
  final String Function(T) label;

  const SegmentedRow({super.key, required this.options, required this.selected,
      required this.onSelect, required this.label});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Row(
      children: [
        for (int i = 0; i < options.length; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          Expanded(
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                onSelect(options[i]);
              },
              child: Container(
                height: 40,
                decoration: BoxDecoration(
                  color: options[i] == selected ? c.accentWeak : c.surface,
                  borderRadius: BorderRadius.circular(ThuieRadii.sm),
                  border: Border.all(
                    color: options[i] == selected ? c.accent : c.hairline,
                    width: options[i] == selected ? 1.5 : 0.5,
                  ),
                ),
                child: Center(
                  child: Text(
                    label(options[i]),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: options[i] == selected ? c.accent : c.ink2,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
