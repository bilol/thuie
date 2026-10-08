import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class GraduateCompleteScreen extends StatelessWidget {
  const GraduateCompleteScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.graduateCompleteTitle),
      body: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(children: [
          const SizedBox(height: 48),
          Icon(LucideIcons.graduationCap, size: 64, color: c.accent),
          const SizedBox(height: 20),
          Text(L10n.congrats, style: c.titleLarge),
          const SizedBox(height: 8),
          Text(L10n.graduateNote, style: TextStyle(fontSize: 14, color: c.muted, height: 1.6), textAlign: TextAlign.center),
          const SizedBox(height: 32),
          ThuieFilledButton(label: L10n.completeProfile, onTap: () => Navigator.of(context).pushNamed(Routes.myProfileEdit)),
          const SizedBox(height: 12),
          ThuieOutlinedButton(label: L10n.completeLater, onTap: () => Navigator.of(context).pop()),
        ]),
      ),
    );
  }
}
