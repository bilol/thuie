import 'package:flutter/material.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.termsTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.termsTitle, style: c.titleLarge),
          const SizedBox(height: 4),
          MetaText('${L10n.lastUpdated}2026-01-01'),
          const SizedBox(height: 16),
          _TermsSection(title: L10n.termsTotal, body: L10n.termsTotalBody),
          _TermsSection(title: L10n.termsRegistration, body: L10n.termsRegistrationBody),
          _TermsSection(title: L10n.termsContent, body: L10n.termsContentBody),
          _TermsSection(title: L10n.termsPrivacy, body: L10n.termsPrivacyBody),
          _TermsSection(title: L10n.termsDisclaimer, body: L10n.termsDisclaimerBody),
        ]),
      ),
    );
  }
}

class _TermsSection extends StatelessWidget {
  final String title, body;
  const _TermsSection({required this.title, required this.body});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      const SizedBox(height: 6),
      Text(body, style: const TextStyle(fontSize: 14, height: 1.6)),
    ]),
  );
}
