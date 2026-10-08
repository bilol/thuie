import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_review_notifier.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 admin edit of an existing campus info (`GET/PATCH /infos/:id`) with an
/// admin takedown escape hatch (`POST /admin/takedown`).
class AdminInfoEditScreen extends StatefulWidget {
  final String infoId;
  const AdminInfoEditScreen(this.infoId, {super.key});
  @override
  State<AdminInfoEditScreen> createState() => _AdminInfoEditScreenState();
}

class _AdminInfoEditScreenState extends State<AdminInfoEditScreen> {
  final _review = AdminReviewNotifier();
  AsyncStatus _status = AsyncStatus.loading;
  late String _title, _content;
  late InfoCategory _category;
  int _version = 0;

  @override
  void initState() {
    super.initState();
    _title = '';
    _content = '';
    _category = InfoCategory.open;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final info = await context.read<InfosNotifier>().loadDetail(widget.infoId);
    if (!mounted) return;
    setState(() {
      _title = info?.title ?? '';
      _content = info?.content ?? '';
      _category = info?.category ?? InfoCategory.open;
      _version = info?.version ?? 0;
      _status = AsyncStatus.ready;
    });
  }

  @override
  void dispose() {
    _review.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_status != AsyncStatus.ready) {
      return ThuiePage(bar: ThuieBar(title: L10n.editInfoTitle), body: const Center(child: ThuieLoader()));
    }
    return ThuiePage(
      bar: ThuieBar(title: L10n.editInfoTitle),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(children: [
          FlatField(value: _title, onChanged: (v) => _title = v, label: L10n.titleLabel),
          const SizedBox(height: 12),
          SectionLabel(L10n.category),
          const SizedBox(height: 8),
          SegmentedRow<InfoCategory>(
            options: const [InfoCategory.open, InfoCategory.internal, InfoCategory.recruitment],
            selected: _category,
            onSelect: (v) => setState(() => _category = v),
            label: (v) => switch (v) { InfoCategory.open => L10n.openLabel, InfoCategory.internal => L10n.campusLabel, InfoCategory.recruitment => L10n.recruitmentLabel },
          ),
          const SizedBox(height: 12),
          FlatField(value: _content, onChanged: (v) => _content = v, label: L10n.bodyLabel, singleLine: false, maxLines: 8),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: ThuieOutlinedButton(label: L10n.takedown, onTap: () {
              showThuieConfirm(context,
                title: L10n.takedown,
                body: L10n.takedownConfirm(_title),
                confirmLabel: L10n.takedown,
                destructive: true,
                onConfirm: () {
                  _review.takedown('info_post', widget.infoId);
                  Navigator.of(context).pop();
                },
              );
            })),
            const SizedBox(width: 10),
            Expanded(child: ThuieFilledButton(label: L10n.save, onTap: () {
              if (_title.trim().isEmpty) return;
              context.read<InfosNotifier>().update(widget.infoId,
                  title: _title.trim(), content: _content.trim(), category: _category, version: _version);
              Navigator.of(context).pop();
            })),
          ]),
        ]),
      ),
    );
  }
}
