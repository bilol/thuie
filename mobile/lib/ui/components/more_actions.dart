import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../l10n.dart';
import '../theme/thuie_theme.dart';
import 'dialogs.dart';

/// A single entry in a [MoreActionsButton] overflow sheet. `danger` tints the
/// icon + label with the destructive colour (delete / cancel).
class MoreAction {
  final IconData icon;
  final String label;
  final bool danger;
  final VoidCallback onTap;
  const MoreAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });
}

/// Kebab ("more actions") trigger that reveals [actions] in a bottom sheet,
/// mirroring the app's overflow-menu idiom (the Me tab). Lets a list card expose
/// secondary / destructive actions behind a single affordance instead of a row
/// of inline buttons. The sheet closes before [MoreAction.onTap] runs, so the
/// action can navigate or confirm without the sheet in the way.
class MoreActionsButton extends StatelessWidget {
  final List<MoreAction> actions;
  const MoreActionsButton({super.key, required this.actions});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Semantics(
      button: true,
      label: L10n.moreOptions,
      child: GestureDetector(
        onTap: () {
          showThuieBottomSheet(context, builder: (_) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                for (final a in actions)
                  _SheetAction(
                    icon: a.icon,
                    label: a.label,
                    danger: a.danger,
                    onTap: () {
                      Navigator.pop(context);
                      a.onTap();
                    },
                  ),
              ]),
            );
          });
        },
        child: ExcludeSemantics(
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: c.surfaceSunken,
              borderRadius: BorderRadius.circular(ThuieRadii.lg)
            ),
            child: Icon(LucideIcons.moreHorizontal, size: 20, color: c.ink2),
          ),
        ),
      ),
    );
  }
}

class _SheetAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool danger;
  final VoidCallback onTap;
  const _SheetAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final tint = danger ? c.danger : c.accent;
    return Semantics(
      button: true,
      label: label,
      child: ExcludeSemantics(
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: tint.withAlpha(15),
                  borderRadius: BorderRadius.circular(ThuieRadii.lg)
                ),
                child: Icon(icon, size: 20, color: tint),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(label,
                    style: TextStyle(fontSize: 15, color: danger ? c.danger : c.ink)),
              ),
              Icon(LucideIcons.chevronRight, size: 16, color: c.muted),
            ]),
          ),
        ),
      ),
    );
  }
}
