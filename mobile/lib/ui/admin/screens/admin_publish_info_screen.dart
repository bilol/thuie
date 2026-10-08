import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 publish an official campus info as a full-screen form
/// (`POST /infos` via [InfosNotifier]). Replaces the old console dialog.
class AdminPublishInfoScreen extends StatefulWidget {
  const AdminPublishInfoScreen({super.key});
  @override
  State<AdminPublishInfoScreen> createState() => _AdminPublishInfoScreenState();
}

class _AdminPublishInfoScreenState extends State<AdminPublishInfoScreen> {
  String _title = '', _content = '';
  InfoCategory _category = InfoCategory.open;
  ContentVisibility _visibility = ContentVisibility.all;
  bool _pinned = false;
  bool _busy = false;

  Future<void> _publish() async {
    if (_busy || _title.trim().isEmpty) return;
    setState(() => _busy = true);
    final infos = context.read<InfosNotifier>();
    final created = await infos.create(
      title: _title.trim(),
      content: _content.trim(),
      category: _category,
      visibility: _visibility,
      pinned: _pinned,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    if (created == null) {
      messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(infos.error?.code))));
      return;
    }
    navigator.pop();
    messenger.showSnackBar(SnackBar(content: Text(L10n.publishSuccessMsg), duration: const Duration(seconds: 2)));
  }

  @override
  Widget build(BuildContext context) {
    return ThuiePage(
      bar: ThuieBar(title: L10n.publishOfficialTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(children: [
          FlatField(value: _title, onChanged: (v) => _title = v, label: L10n.titleLabel),
          const SizedBox(height: 12),
          FlatField(value: _content, onChanged: (v) => _content = v, label: L10n.bodyLabel, singleLine: false, maxLines: 8),
          const SizedBox(height: 12),
          SectionLabel(L10n.category),
          SegmentedRow<InfoCategory>(
            options: const [InfoCategory.open, InfoCategory.internal, InfoCategory.recruitment],
            selected: _category,
            onSelect: (v) => setState(() => _category = v),
            label: (v) => switch (v) { InfoCategory.open => L10n.openLabel, InfoCategory.internal => L10n.campusLabel, InfoCategory.recruitment => L10n.recruitmentLabel },
          ),
          const SizedBox(height: 12),
          SectionLabel(L10n.visibility),
          SegmentedRow<ContentVisibility>(
            options: const [ContentVisibility.all, ContentVisibility.studentOnly, ContentVisibility.adminOnly],
            selected: _visibility,
            onSelect: (v) => setState(() => _visibility = v),
            label: (v) => v.label(),
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: Text(L10n.pinnedLabel, style: const TextStyle(fontSize: 14))),
            Switch(value: _pinned, onChanged: (v) => setState(() => _pinned = v)),
          ]),
          const SizedBox(height: 20),
          ThuieFilledButton(
            label: _busy ? L10n.publishing : L10n.publish,
            onTap: _busy ? null : _publish,
          ),
        ]),
      ),
    );
  }
}
