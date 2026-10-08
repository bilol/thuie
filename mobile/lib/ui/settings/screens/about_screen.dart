import 'package:flutter/material.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.aboutTitle),
      body: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(children: [
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              color: brandPurple,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Image.asset('assets/logo.png', width: 200, fit: BoxFit.contain),
          ),
          const SizedBox(height: 16),
          Text(L10n.thuieAlumni, style: c.titleLarge),
          const SizedBox(height: 4),
          Text(L10n.versionString('1.0.0'), style: TextStyle(color: c.muted, fontSize: 13)),
          const SizedBox(height: 32),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(ThuieSpace.lg),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(L10n.aboutDesc, style: TextStyle(fontSize: 14, height: 1.6, color: c.ink2)),
            ]),
          ),
          const SizedBox(height: 24),
          _AboutRow(label: L10n.devTeam, value: 'THUIE Team'),
          _AboutRow(label: L10n.contactEmail, value: 'support@thuie.edu'),
          _AboutRow(label: L10n.website, value: 'www.thuie.edu'),
          const Spacer(),
          MetaText(L10n.copyright),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }
}

class _AboutRow extends StatelessWidget {
  final String label, value;
  const _AboutRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Text(label, style: TextStyle(fontSize: 14, color: c.muted)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 14)),
      ]),
    );
  }
}
