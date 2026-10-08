import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../data/models.dart';
import '../../l10n.dart';
import '../theme/thuie_theme.dart';
import 'seal.dart';

/// Domain-bound badge wrappers over [Seal] plus the count bubble.
class RoleBadge extends StatelessWidget {
  final Role role;
  const RoleBadge(this.role, {super.key});

  @override
  Widget build(BuildContext context) {
    final (tone, text) = switch (role) {
      Role.student => (SealTone.accent, L10n.roleStudent),
      Role.graduate => (SealTone.ok, L10n.roleGraduate),
      _ => (SealTone.bronze, L10n.roleAdmin),
    };
    return Seal(text: text, tone: tone, filled: true);
  }
}

class CategoryBadge extends StatelessWidget {
  final InfoCategory category;
  const CategoryBadge(this.category, {super.key});

  @override
  Widget build(BuildContext context) {
    final text = switch (category) {
      InfoCategory.internal => L10n.campusLabel,
      InfoCategory.open => L10n.openLabel,
      InfoCategory.recruitment => L10n.recruitmentLabel,
    };
    return Seal(text: text, tone: SealTone.neutral);
  }
}

class SourceBadge extends StatelessWidget {
  final InfoSource source;
  const SourceBadge(this.source, {super.key});

  @override
  Widget build(BuildContext context) {
    if (source == InfoSource.official) {
      return Seal(text: L10n.official, tone: SealTone.bronze, filled: true);
    }
    return const SizedBox.shrink();
  }
}

/// Pinned marker rendered as a small pin icon (not a text label) so it reads as
/// a status hint without competing with the badge seals rendered alongside it.
class PinnedLabel extends StatelessWidget {
  const PinnedLabel({super.key});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Icon(LucideIcons.pin, size: 14, color: c.danger);
  }
}

class StatusBadge extends StatelessWidget {
  final ContentStatus status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    final (tone, text) = switch (status) {
      ContentStatus.pending => (SealTone.warn, L10n.statusPending),
      ContentStatus.approved => (SealTone.ok, L10n.statusApproved),
      ContentStatus.rejected => (SealTone.danger, L10n.statusRejected),
      ContentStatus.takenDown => (SealTone.neutral, L10n.statusTakenDown),
    };
    return Seal(text: text, tone: tone);
  }
}

class TagChip extends StatelessWidget {
  final String text;
  final VoidCallback? onTap;
  const TagChip({super.key, required this.text, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(ThuieRadii.sm),
          color: c.accentWeak,
        ),
        child: Text('#$text', style: TextStyle(fontSize: 12, height: 1.3, color: c.accent, fontWeight: FontWeight.w500)),
      ),
    );
  }
}

class SchoolBadge extends StatelessWidget {
  const SchoolBadge({super.key});
  @override
  Widget build(BuildContext context) => Seal(text: L10n.schoolPublishedLabel, tone: SealTone.bronze, filled: true);
}

/// Count bubble overlaid on a child (e.g. tab or icon badges).
class ThuieBadge extends StatelessWidget {
  final int count;
  final Widget child;
  const ThuieBadge({super.key, required this.count, required this.child});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Stack(clipBehavior: Clip.none, children: [
      child,
      if (count > 0)
        Positioned(
          right: -4, top: -4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
            decoration: BoxDecoration(
              color: c.danger,
              borderRadius: BorderRadius.circular(ThuieRadii.lg)
            ),
            constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
            child: Text('$count', textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700, height: 1.1)),
          ),
        ),
    ]);
  }
}
