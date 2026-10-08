import 'package:flutter/material.dart';
import '../theme/thuie_theme.dart';
import 'sections.dart';

/// Bordered flat text field with label, placeholder and secret support.
class FlatField extends StatefulWidget {
  final String value;
  final ValueChanged<String> onChanged;
  final String? label;
  final String? placeholder;
  final Widget? leadingIcon;
  final Widget? trailingIcon;
  final VoidCallback? onTrailingTap;
  final bool secret;
  final bool singleLine;
  final int maxLines;
  final bool enabled;
  final bool isError;

  const FlatField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.placeholder,
    this.leadingIcon,
    this.trailingIcon,
    this.onTrailingTap,
    this.secret = false,
    this.singleLine = true,
    this.maxLines = 1,
    this.enabled = true,
    this.isError = false,
  });

  @override
  State<FlatField> createState() => _FlatFieldState();
}

class _FlatFieldState extends State<FlatField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(FlatField oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Sync only on programmatic external changes (clear/prefill); typing already
    // lives in the controller, so replacing it there would move the cursor.
    if (widget.value != oldWidget.value && widget.value != _controller.text) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          SectionLabel(widget.label!),
          const SizedBox(height: 8),
        ],
        Material(
          color: c.surfaceSunken,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: widget.isError ? c.danger : c.hairline, width: 0.5),
            ),
            child: TextField(
              controller: _controller,
              onChanged: widget.onChanged,
              obscureText: widget.secret,
              enabled: widget.enabled,
              maxLines: widget.singleLine ? 1 : widget.maxLines,
              style: TextStyle(fontSize: 14, color: c.ink),
              decoration: InputDecoration(
                hintText: widget.placeholder,
                hintStyle: TextStyle(fontSize: 14, color: c.muted),
                prefixIcon: widget.leadingIcon != null ? IconTheme(data: IconThemeData(color: c.muted), child: widget.leadingIcon!) : null,
                suffixIcon: widget.trailingIcon != null
                    ? IconButton(icon: widget.trailingIcon!, onPressed: widget.onTrailingTap, color: c.muted)
                    : null,
                border: InputBorder.none,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                errorText: widget.isError ? '' : null,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
