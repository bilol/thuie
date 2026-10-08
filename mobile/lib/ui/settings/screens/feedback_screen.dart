import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/notifiers/feedback_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});
  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  String _content = '';
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    return ThuiePage(
      bar: ThuieBar(title: L10n.feedbackTitle),
      body: Padding(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(children: [
          FlatField(value: _content, onChanged: (v) => _content = v, label: L10n.feedbackContentLabel, singleLine: false, maxLines: 6),
          const SizedBox(height: 16),
          ThuieFilledButton(label: L10n.submitFeedbackLabel, onTap: _busy ? null : () async {
            if (_content.trim().isEmpty) return;
            final navigator = Navigator.of(context);
            final messenger = ScaffoldMessenger.of(context);
            final feedback = context.read<FeedbackNotifier>();
            setState(() => _busy = true);
            final sent = await feedback.submit(_content.trim());
            if (!mounted) return;
            setState(() => _busy = false);
            if (sent == null) {
              messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(feedback.error?.code))));
              return;
            }
            navigator.pop();
            messenger.showSnackBar(SnackBar(content: Text(L10n.success)));
          }),
        ]),
      ),
    );
  }
}
