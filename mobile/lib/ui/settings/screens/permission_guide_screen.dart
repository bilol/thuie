import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class PermissionGuideScreen extends StatelessWidget {
  const PermissionGuideScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.permissionGuideTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.permissionNote, style: TextStyle(fontSize: 14, color: c.ink2)),
          const SizedBox(height: 20),
          _PermGuideTile(icon: LucideIcons.camera, title: L10n.camera, desc: L10n.cameraDesc),
          _PermGuideTile(icon: LucideIcons.image, title: L10n.gallery, desc: L10n.galleryDesc),
          _PermGuideTile(icon: LucideIcons.bell, title: L10n.notificationPerm, desc: L10n.notificationDesc),
          _PermGuideTile(icon: LucideIcons.mapPin, title: L10n.location, desc: L10n.locationDesc),
          const SizedBox(height: 24),
          ThuieFilledButton(label: L10n.gotoSettings, onTap: () => Navigator.of(context).pop()),
        ]),
      ),
    );
  }
}

class _PermGuideTile extends StatelessWidget {
  final IconData icon;
  final String title, desc;
  const _PermGuideTile({required this.icon, required this.title, required this.desc});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
          border: Border.all(color: c.hairline, width: 0.5),
        ),
        child: Row(children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: c.accentWeak, borderRadius: BorderRadius.circular(ThuieRadii.md)),
            child: Icon(icon, size: 20, color: c.accent)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
            const SizedBox(height: 2),
            Text(desc, style: TextStyle(fontSize: 12, color: c.muted)),
          ])),
          Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
        ]),
      ),
    );
  }
}
