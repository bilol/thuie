import 'package:flutter/material.dart';
import '../../data/models.dart';
import '../../l10n.dart';
import '../theme/thuie_theme.dart';
import 'sections.dart';
import 'seal.dart';

/// Read-only review timeline backed by the `moderation_actions` audit table.
/// Reused on the admin review-detail screen and the author's own content detail.
class ModerationHistorySection extends StatelessWidget {
  final List<ModerationAction> actions;
  const ModerationHistorySection({super.key, required this.actions});

  static String actionLabel(String action) => switch (action) {
        'submitted' => L10n.actionSubmitted,
        'approved' => L10n.actionApproved,
        'rejected' => L10n.actionRejected,
        'resubmitted' => L10n.actionResubmitted,
        'takenDown' => L10n.actionTakenDown,
        _ => action,
      };

  static SealTone _tone(String action) => switch (action) {
        'approved' => SealTone.ok,
        'rejected' || 'takenDown' => SealTone.danger,
        'resubmitted' => SealTone.warn,
        _ => SealTone.neutral,
      };

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SectionTitle(title: L10n.reviewHistoryTitle),
      const SizedBox(height: 6),
      if (actions.isEmpty)
        MetaText(L10n.noReviewHistory)
      else
        for (final a in actions)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Seal(text: actionLabel(a.action), tone: _tone(a.action)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    '${a.actorName == '系统' ? L10n.systemActorLabel : a.actorName} · ${Fmt.relative(a.createdAt)}',
                    style: TextStyle(fontSize: 12, color: c.muted),
                  ),
                  if (a.reason.isNotEmpty)
                    Text(a.reason, style: const TextStyle(fontSize: 13, height: 1.3)),
                ]),
              ),
            ]),
          ),
    ]);
  }
}
