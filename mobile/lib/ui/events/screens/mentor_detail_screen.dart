import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/mentorship_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Mentor detail (§6.11). Opened from the mentor list card by the mentor's
/// **user** id; the row is read back out of [MentorshipNotifier] (the browse
/// feed is already loaded). The apply / cancel-apply action lives here rather
/// than on the list card, so tapping a card opens detail instead of firing a
/// mutation.
class MentorDetailScreen extends StatefulWidget {
  final String mentorUserId;
  const MentorDetailScreen(this.mentorUserId, {super.key});
  @override
  State<MentorDetailScreen> createState() => _MentorDetailScreenState();
}

class _MentorDetailScreenState extends State<MentorDetailScreen> {
  Future<void> _toggleApply(MentorshipNotifier notifier, bool applied) async {
    final messenger = ScaffoldMessenger.of(context);
    if (applied) {
      final pending = notifier.pendingApplicationTo(widget.mentorUserId);
      if (pending == null) return;
      final ok = await notifier.close(pending.id);
      messenger.showSnackBar(SnackBar(
        content: Text(ok ? L10n.applicationCancelledMsg : L10n.actionError(notifier.error?.code)),
        duration: const Duration(seconds: 1),
      ));
    } else {
      // Capacity is enforced server-side (409 when the mentor is full).
      final ok = await notifier.apply(widget.mentorUserId);
      messenger.showSnackBar(SnackBar(
        content: Text(ok ? L10n.applicationSentMsg : L10n.actionError(notifier.error?.code)),
        duration: const Duration(seconds: 1),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final notifier = context.watch<MentorshipNotifier>();
    final m = notifier.byUserId(widget.mentorUserId);

    if (m == null) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.mentorDetail),
        body: ResultState(
          icon: LucideIcons.userX,
          title: L10n.resultUnavailable,
          message: L10n.profileNotFound,
          actionLabel: L10n.goBackAction,
        ),
      );
    }

    final applied = notifier.hasAppliedTo(m.userId);
    final programClass = [
      if (m.program.isNotEmpty) m.program,
      if (m.gradeYear.isNotEmpty) '${m.gradeYear}${L10n.classOfGrade}',
    ].join(' · ');

    return ThuiePage(
      bar: ThuieBar(title: L10n.mentorDetail),
      body: Column(children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(ThuieSpace.lg),
            children: [
              Row(children: [
                Avatar(name: m.name, seed: m.id.hashCode, size: 56, imagePath: m.avatarUrl),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(m.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                  if (programClass.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    MetaText(programClass),
                  ],
                ])),
              ]),
              const SizedBox(height: 12),
              Wrap(spacing: 6, runSpacing: 4, children: [
                if (m.mentorArea.isNotEmpty) Seal(text: m.mentorArea, tone: SealTone.ok),
                Seal(
                  text: m.active ? '${m.currentMentees}/${m.maxMentees}' : L10n.mentorPausedBadge,
                  tone: m.active ? SealTone.neutral : SealTone.danger,
                ),
              ]),
              if (m.expertise.isNotEmpty) ...[
                const SizedBox(height: 16),
                SectionLabel(L10n.expertiseLabel),
                const SizedBox(height: 6),
                Text(m.expertise, style: TextStyle(fontSize: 14, color: c.ink2, height: 1.4)),
              ],
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerLeft,
                child: ThuieTextButton(
                  label: L10n.viewFullProfile,
                  fontSize: 13,
                  onTap: () => Navigator.of(context).pushNamed(Routes.alumniDetail, arguments: m.userId),
                ),
              ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: applied
                ? ThuieOutlinedButton(label: L10n.cancelApplyLabel, onTap: () => _toggleApply(notifier, applied))
                : ThuieFilledButton(label: L10n.applyGuideLabel, onTap: () => _toggleApply(notifier, applied)),
          ),
        ),
      ]),
    );
  }
}
