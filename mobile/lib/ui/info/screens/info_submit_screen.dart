import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/models.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class InfoSubmitScreen extends StatefulWidget {
  const InfoSubmitScreen({super.key});
  @override
  State<InfoSubmitScreen> createState() => _InfoSubmitScreenState();
}

class _InfoSubmitScreenState extends State<InfoSubmitScreen> {
  String _title = '', _content = '';
  InfoCategory _category = InfoCategory.recruitment;
  String? _error;
  bool _attempted = false;

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.submitInfoTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.submitNoteText, style: TextStyle(fontSize: 12, color: c.muted)),
          const SizedBox(height: 12),
          SectionLabel(L10n.categoryLabel),
          const SizedBox(height: 8),
          Row(children: [
            TagChip(text: L10n.openLabel, onTap: () => setState(() => _category = InfoCategory.open)),
            const SizedBox(width: 6),
            TagChip(text: L10n.recruitmentLabel, onTap: () => setState(() => _category = InfoCategory.recruitment)),
          ]),
          const SizedBox(height: 12),
          FlatField(value: _title, onChanged: (v) { _title = v; if (_attempted && _title.trim().isNotEmpty) setState(() {}); }, label: L10n.titleLabel, isError: _attempted && _title.trim().isEmpty),
          const SizedBox(height: 12),
          FlatField(value: _content, onChanged: (v) { _content = v; if (_attempted && _content.trim().isNotEmpty) setState(() {}); }, label: L10n.bodyLabel, singleLine: false, maxLines: 8, isError: _attempted && _content.trim().isEmpty),
          const SizedBox(height: 12),
          if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(label: L10n.submitForReview, onTap: () async {
            if (_title.trim().isEmpty || _content.trim().isEmpty) { setState(() { _attempted = true; _error = L10n.fillTitleAndContent; }); return; }
            setState(() => _error = null);
            final infos = context.read<InfosNotifier>();
            final messenger = ScaffoldMessenger.of(context);
            final navigator = Navigator.of(context);
            final created = await infos.create(
              title: _title.trim(),
              content: _content.trim(),
              category: _category,
            );
            if (!mounted) return;
            if (created != null) {
              messenger.showSnackBar(
                SnackBar(content: Text(L10n.submittedForReview), duration: const Duration(seconds: 1)),
              );
              navigator.pop();
            } else {
              final e = infos.error;
              setState(() => _error = e is ApiError ? L10n.describeApiError(e.code) : L10n.errGeneric);
            }
          }),
        ]),
      ),
    );
  }
}
