import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/email_service.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Swipeable inbox row shared by the email list and the detail screen
/// (detail reuses [avatarColor] for the sender chip).
class EmailTile extends StatelessWidget {
  final EmailMessage email;
  final VoidCallback onToggleStar, onDelete, onArchive, onToggleRead;
  const EmailTile({super.key, required this.email, required this.onToggleStar, required this.onDelete, required this.onArchive, required this.onToggleRead});

  static const _avatarColors = [Color(0xFF3B82F6), Color(0xFF8B5CF6), Color(0xFF059669), Color(0xFFD97706), Color(0xFFDC2626), Color(0xFF0891B2)];

  static Color avatarColor(String name) {
    final hash = name.hashCode.abs();
    return _avatarColors[hash % _avatarColors.length];
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year && date.month == now.month && date.day == now.day) {
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
    final diff = now.difference(date);
    if (diff.inDays == 1) return L10n.yesterday;
    if (diff.inDays < 7) return L10n.daysAgo(diff.inDays);
    return '${date.month}/${date.day}';
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final bgColor = avatarColor(email.from);

    final tile = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: email.unread ? c.accentWeak.withAlpha(30) : null,
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: bgColor.withAlpha(25), borderRadius: BorderRadius.circular(12)),
          child: Center(child: Text(email.from.characters.first, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: bgColor))),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(email.from, style: TextStyle(fontSize: 14, fontWeight: email.unread ? FontWeight.w600 : FontWeight.w400, color: c.ink), maxLines: 1, overflow: TextOverflow.ellipsis)),
            if (email.hasAttachment) ...[const SizedBox(width: 4), Icon(LucideIcons.paperclip, size: 13, color: c.muted)],
            const SizedBox(width: 6),
            Text(_formatTime(email.date), style: TextStyle(fontSize: 11, color: c.muted)),
          ]),
          const SizedBox(height: 3),
          Text(email.subject, style: TextStyle(fontSize: 13, fontWeight: email.unread ? FontWeight.w500 : FontWeight.w400, color: c.ink2), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Row(children: [
            Expanded(child: Text(email.body.split('\n').first, style: TextStyle(fontSize: 12, color: c.muted), maxLines: 1, overflow: TextOverflow.ellipsis)),
            GestureDetector(
              onTap: onToggleStar,
              child: Padding(padding: const EdgeInsets.all(4), child: Icon(
                LucideIcons.star,
                size: 15,
                color: email.starred ? const Color(0xFFF59E0B) : c.hairlineStrong,
              )),
            ),
          ]),
        ])),
      ]),
    );

    return SwipeableTile(
      key: ValueKey(email.id),
      leftActions: [
        SwipeAction(icon: LucideIcons.archive, color: const Color(0xFF059669), onTap: onArchive, label: L10n.archive),
        SwipeAction(icon: LucideIcons.star, color: const Color(0xFFF59E0B), onTap: onToggleStar, label: email.starred ? L10n.unstar : L10n.star),
      ],
      rightActions: [
        SwipeAction(icon: LucideIcons.trash2, color: c.danger, onTap: onDelete, label: L10n.delete),
        SwipeAction(icon: email.unread ? LucideIcons.eye : LucideIcons.eyeOff, color: c.accent, onTap: onToggleRead, label: email.unread ? L10n.markRead : L10n.markUnread),
      ],
      child: GestureDetector(
        onTap: () {
          if (email.unread) onToggleRead();
          Navigator.of(context).pushNamed(Routes.emailDetail, arguments: email);
        },
        child: tile,
      ),
    );
  }
}
