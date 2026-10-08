import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class PostCreateScreen extends StatefulWidget {
  const PostCreateScreen({super.key});
  @override
  State<PostCreateScreen> createState() => _PostCreateScreenState();
}

class _PostCreateScreenState extends State<PostCreateScreen> {
  String _title = '', _content = '', _tags = '';
  String? _error;
  bool _attempted = false;

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return ThuiePage(
      bar: ThuieBar(title: L10n.createPostTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(children: [
          FlatField(value: _title, onChanged: (v) { _title = v; if (_attempted && _title.trim().isNotEmpty) setState(() {}); }, label: L10n.titleLabel, isError: _attempted && _title.trim().isEmpty),
          const SizedBox(height: 12),
          FlatField(value: _content, onChanged: (v) { _content = v; if (_attempted && _content.trim().isNotEmpty) setState(() {}); }, label: L10n.bodyLabel, singleLine: false, maxLines: 8, isError: _attempted && _content.trim().isEmpty),
          const SizedBox(height: 12),
          FlatField(value: _tags, onChanged: (v) => _tags = v, label: L10n.tagsLabel),
          const SizedBox(height: 12),
          if (_error != null) ...[const SizedBox(height: 10), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(label: L10n.postLabel, onTap: () async {
            if (_title.trim().isEmpty || _content.trim().isEmpty) { setState(() { _attempted = true; _error = L10n.fillTitleAndContent; }); return; }
            setState(() => _error = null);
            final tags = _tags.split(RegExp(r'[,，]')).map((t) => t.trim()).where((t) => t.isNotEmpty).toList();
            final notifier = context.read<ForumNotifier>();
            final messenger = ScaffoldMessenger.of(context);
            final navigator = Navigator.of(context);
            final created = await notifier.create(title: _title.trim(), content: _content.trim(), tags: tags);
            if (!mounted) return;
            if (created != null) {
              messenger.showSnackBar(
                SnackBar(content: Text(L10n.postSubmittedForReview), duration: const Duration(seconds: 1)),
              );
              navigator.pop();
            } else {
              final e = notifier.error;
              setState(() => _error = e is ApiError ? L10n.describeApiError(e.code) : L10n.errGeneric);
            }
          }),
        ]),
      ),
    );
  }
}
