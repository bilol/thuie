import 'package:flutter/material.dart';
import '../../../data/models.dart';
import '../../theme/thuie_theme.dart';
import '../../components/common.dart';
import '../../../l10n.dart';

class FacultyDetailScreen extends StatelessWidget {
  final FacultyMember member;
  const FacultyDetailScreen(this.member, {super.key});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: member.name),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Avatar(name: member.name, seed: member.id.hashCode, size: 64, imagePath: member.imageUrl),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(member.name, style: c.titleLarge),
              const SizedBox(height: 4),
              MetaText(member.title),
            ])),
          ]),
          // Contact/meta card only renders when it actually has a row to show,
          // now that department + title live solely in the header above.
          if (member.researchArea.isNotEmpty || member.email.isNotEmpty || (member.phone?.isNotEmpty ?? false)) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(ThuieSpace.lg),
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.circular(ThuieRadii.md),
                border: Border.all(color: c.hairline, width: 0.5),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (member.researchArea.isNotEmpty) _DetailRow(label: L10n.researchArea, value: member.researchArea, stacked: true),
                if (member.email.isNotEmpty) _DetailRow(label: L10n.email, value: member.email),
                if (member.phone?.isNotEmpty ?? false) _DetailRow(label: L10n.phone, value: member.phone!),
              ]),
            ),
          ],
          if (member.bio.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(L10n.facultyBio, style: c.labelSmall),
            const SizedBox(height: 6),
            Text(member.bio, style: c.bodyLarge),
          ],
        ]),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label, value;
  final bool stacked;
  const _DetailRow({required this.label, required this.value, this.stacked = false});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    // Research areas (and other long text) read better with the value dropped
    // onto its own line under the label; short fields like email/phone stay inline.
    if (stacked) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 13, color: c.muted)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 13)),
        ]),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        Text(label, style: TextStyle(fontSize: 13, color: c.muted)),
        const SizedBox(width: 16),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }
}
