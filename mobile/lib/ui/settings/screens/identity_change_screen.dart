import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class IdentityChangeScreen extends StatelessWidget {
  const IdentityChangeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.identityChangeTitle),
      body: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.identityChangeNote, style: TextStyle(fontSize: 14, color: c.ink2, height: 1.6)),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(ThuieSpace.lg),
            decoration: BoxDecoration(
              color: c.accentWeak,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(LucideIcons.shield, size: 18, color: c.accent),
                const SizedBox(width: 8),
                Text(L10n.adminContact, style: TextStyle(fontWeight: FontWeight.w600, color: c.accent)),
              ]),
              const SizedBox(height: 8),
              Text(L10n.adminEmailContact, style: TextStyle(fontSize: 13, color: c.ink2)),
              Text(L10n.adminOffice, style: TextStyle(fontSize: 13, color: c.ink2)),
            ]),
          ),
        ]),
      ),
    );
  }
}
