import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/email_service.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/compose_args.dart';
import '../widgets/email_tile.dart';

class EmailDetailScreen extends StatelessWidget {
  final EmailMessage email;
  const EmailDetailScreen(this.email, {super.key});

  String _formatDate(DateTime date) {
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final bgColor = EmailTile.avatarColor(email.from);

    return ThuiePage(
      bar: ThuieBar(title: L10n.emailDetail, actions: [
        ThuieIconButton(icon: LucideIcons.star, size: 20,
          color: email.starred ? const Color(0xFFF59E0B) : null,
          onTap: () => context.read<EmailService>().toggleStar(email.id)),
        ThuieIconButton(icon: LucideIcons.trash2, size: 20, onTap: () {
          context.read<EmailService>().moveToTrash(email.id);
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.movedToTrash), duration: Duration(seconds: 1)));
        }),
      ]),
      body: SingleChildScrollView(padding: const EdgeInsets.all(ThuieSpace.lg), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(email.subject, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: c.ink)),
        if (email.hasAttachment) ...[
          const SizedBox(height: 6),
          Row(children: [
            Icon(LucideIcons.paperclip, size: 14, color: c.muted),
            const SizedBox(width: 4),
            Text(L10n.attachmentsCount(email.attachments.length), style: TextStyle(fontSize: 12, color: c.muted)),
          ]),
        ],
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Column(children: [
            Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: bgColor.withAlpha(25), borderRadius: BorderRadius.circular(12)),
                child: Center(child: Text(email.from.characters.first, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: bgColor))),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(email.from, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: c.ink)),
                Text(email.fromEmail, style: TextStyle(fontSize: 12, color: c.muted)),
              ])),
              Text(_formatDate(email.date), style: TextStyle(fontSize: 12, color: c.muted)),
            ]),
            if (email.to != null) ...[
              const SizedBox(height: 8),
              Text(L10n.toRecipient(email.to!), style: TextStyle(fontSize: 12, color: c.muted)),
            ],
          ]),
        ),
        const SizedBox(height: 16),
        Text(email.body, style: TextStyle(fontSize: 14, color: c.ink, height: 1.6)),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(child: ThuieFilledButton(label: L10n.reply, leading: Icon(LucideIcons.reply, size: 16, color: c.onAccent), onTap: () {
            Navigator.of(context).pushNamed(Routes.emailCompose, arguments: ComposeArgs(to: email.fromEmail, subject: 'Re: ${email.subject}'));
          })),
          const SizedBox(width: 10),
          Expanded(child: ThuieOutlinedButton(label: L10n.forward, onTap: () {
            Navigator.of(context).pushNamed(Routes.emailCompose, arguments: ComposeArgs(subject: 'Fwd: ${email.subject}', body: L10n.forwardHeader(email.from, email.body)));
          })),
        ]),
      ])),
    );
  }
}
