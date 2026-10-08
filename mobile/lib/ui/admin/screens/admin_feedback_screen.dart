import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../data/models/admin_feedback.dart';
import '../../../data/notifiers/admin_feedback_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/admin_dialogs.dart';

/// §6.15/§6.17 admin feedback inbox (`GET /admin/feedback`, newest first). Each
/// thread can be answered (`PATCH /admin/feedback/:id` posts a reply, which
/// notifies the author) and moved through open → answered → closed.
class AdminFeedbackScreen extends StatefulWidget {
  const AdminFeedbackScreen({super.key});
  @override
  State<AdminFeedbackScreen> createState() => _AdminFeedbackScreenState();
}

class _AdminFeedbackScreenState extends State<AdminFeedbackScreen> {
  final _notifier = AdminFeedbackNotifier();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _notifier.load());
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AdminFeedbackNotifier>.value(
      value: _notifier,
      child: const _AdminFeedbackBody(),
    );
  }
}

class _AdminFeedbackBody extends StatelessWidget {
  const _AdminFeedbackBody();

  void _reply(BuildContext context, AdminFeedbackNotifier n, AdminFeedback f) {
    showAdminInputDialog(
      context,
      title: L10n.reply,
      hint: L10n.inputFeedbackReply,
      confirmLabel: L10n.feedbackSend,
      onConfirm: (text) async {
        final messenger = ScaffoldMessenger.of(context);
        final ok = await n.reply(f.id, text: text);
        messenger.showSnackBar(SnackBar(
          content: Text(ok ? L10n.feedbackReplySent : L10n.actionError(n.error?.code)),
          duration: const Duration(seconds: 2),
        ));
      },
    );
  }

  Future<void> _setStatus(BuildContext context, AdminFeedbackNotifier n, AdminFeedback f) async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await n.reply(f.id, status: f.isClosed ? 'open' : 'closed');
    if (!ok) {
      messenger.showSnackBar(SnackBar(
        content: Text(L10n.actionError(n.error?.code)),
        duration: const Duration(seconds: 2),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AdminFeedbackNotifier>();
    final c = ThuieTheme.colorsOf(context);

    final body = switch (notifier.status) {
      AsyncStatus.idle || AsyncStatus.loading => const Center(child: ThuieLoader()),
      AsyncStatus.error => ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        ),
      AsyncStatus.ready => notifier.items.isEmpty
          ? EmptyState(text: L10n.noFeedbacks)
          : ListView.separated(
              padding: const EdgeInsets.all(ThuieSpace.lg),
              itemCount: notifier.items.length + (notifier.hasMorePages ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                if (i >= notifier.items.length) {
                  return Center(
                    child: TextButton(
                      onPressed: notifier.loadMore,
                      child: Text(L10n.loadMore,
                          style: TextStyle(fontSize: 12, color: c.muted)),
                    ),
                  );
                }
                final f = notifier.items[i];
                return _FeedbackCard(
                  feedback: f,
                  onReply: () => _reply(context, notifier, f),
                  onToggle: () => _setStatus(context, notifier, f),
                );
              },
            ),
    };

    return ThuiePage(bar: ThuieBar(title: L10n.userFeedback), body: body);
  }
}

class _FeedbackCard extends StatelessWidget {
  final AdminFeedback feedback;
  final VoidCallback onReply;
  final VoidCallback onToggle;
  const _FeedbackCard({required this.feedback, required this.onReply, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final f = feedback;
    final tone = switch (f.status) {
      'answered' => c.ok,
      'closed' => c.muted,
      _ => c.warn,
    };
    final label = switch (f.status) {
      'answered' => L10n.feedbackStatusAnswered,
      'closed' => L10n.feedbackStatusClosed,
      _ => L10n.feedbackStatusOpen,
    };
    final meta = <String>[
      if (f.userName.isNotEmpty) f.userName,
      Fmt.relative(f.createdAt),
    ].join(' · ');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(ThuieRadii.md),
        border: Border.all(color: c.hairline, width: 0.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(meta, style: TextStyle(fontSize: 12, color: c.muted))),
          Text(label,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tone)),
        ]),
        const SizedBox(height: 8),
        Text(f.content, style: const TextStyle(fontSize: 14)),
        const SizedBox(height: 6),
        Text(
          f.reply == null ? L10n.feedbackNoReply : '${L10n.replyPrefix}${f.reply}',
          style: TextStyle(fontSize: 12, color: f.reply == null ? c.muted : c.ink),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: ThuieOutlinedButton(label: L10n.reply, onTap: onReply)),
          const SizedBox(width: 10),
          Expanded(
            child: f.isClosed
                ? ThuieFilledButton(label: L10n.feedbackReopen, onTap: onToggle)
                : ThuieFilledButton(label: L10n.feedbackClose, danger: true, onTap: onToggle),
          ),
        ]),
      ]),
    );
  }
}
