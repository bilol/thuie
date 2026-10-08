import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_review_notifier.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/admin_dialogs.dart';

/// §6.17 single submission review detail. Pulls the info / post body by id from
/// the shared [InfosNotifier] / [ForumNotifier], renders its moderation
/// timeline (`GET /admin/moderation-history/:type/:id`) and approve / reject
/// writes through [AdminReviewNotifier].
class AdminReviewDetailScreen extends StatefulWidget {
  final String kind;
  final String id;
  const AdminReviewDetailScreen(this.kind, this.id, {super.key});
  @override
  State<AdminReviewDetailScreen> createState() => _AdminReviewDetailScreenState();
}

class _AdminReviewDetailScreenState extends State<AdminReviewDetailScreen> {
  final _review = AdminReviewNotifier();
  AsyncStatus _status = AsyncStatus.loading;
  InfoPost? _info;
  Post? _post;
  List<ModerationAction> _history = const [];

  bool get _isInfo => widget.kind == 'info';
  String get _wireType => _isInfo ? 'info_post' : 'forum_post';
  TargetType get _targetType => _isInfo ? TargetType.info : TargetType.post;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final detail = _isInfo
        ? await context.read<InfosNotifier>().loadDetail(widget.id)
        : await context.read<ForumNotifier>().fetchOne(widget.id);
    final history = await _review.loadHistory(_targetType, widget.id);
    if (!mounted) return;
    setState(() {
      if (_isInfo) {
        _info = detail as InfoPost?;
      } else {
        _post = detail as Post?;
      }
      _history = history;
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
    final c = ThuieTheme.colorsOf(context);
    final title = _isInfo ? _info?.title ?? '' : _post?.title ?? '';
    final content = _isInfo ? _info?.content ?? '' : _post?.content ?? '';
    final author = _isInfo ? _info?.authorName ?? '' : _post?.authorName ?? '';

    final body = _status != AsyncStatus.ready
        ? const Center(child: ThuieLoader())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(ThuieSpace.lg),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(ThuieSpace.lg),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                  border: Border.all(color: c.hairline, width: 0.5),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: c.titleMedium),
                  const SizedBox(height: 4),
                  MetaText(L10n.authorPrefix(author)),
                  const SizedBox(height: 12),
                  Text(content, style: c.bodyMedium),
                ]),
              ),
              const SizedBox(height: 20),
              ModerationHistorySection(actions: _history),
              const SizedBox(height: 20),
              Row(children: [
                Expanded(child: ThuieOutlinedButton(label: L10n.reject, onTap: () {
                  final messenger = ScaffoldMessenger.of(context);
                  showAdminInputDialog(context, onConfirm: (r) {
                    _review.reject(_wireType, widget.id, reason: r);
                    Navigator.of(context).pop();
                    messenger.showSnackBar(SnackBar(content: Text(L10n.reviewRejectedMsg), duration: const Duration(seconds: 1)));
                  });
                })),
                const SizedBox(width: 10),
                Expanded(child: ThuieFilledButton(label: L10n.approve, onTap: () {
                  final messenger = ScaffoldMessenger.of(context);
                  _review.approve(_wireType, widget.id);
                  Navigator.of(context).pop();
                  messenger.showSnackBar(SnackBar(content: Text(L10n.reviewApprovedMsg), duration: const Duration(seconds: 1)));
                })),
              ]),
            ]),
          );

    return ThuiePage(bar: ThuieBar(title: L10n.reviewDetailTitle), body: body);
  }
}
