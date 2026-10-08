import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/notifiers/my_content_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// Status tab options for the wire `status` filter: null = all.
const _statusOptions = <String?>[null, 'pending', 'approved', 'rejected'];

String _statusLabel(String? s) => switch (s) {
      null => L10n.allLabel,
      'pending' => L10n.statusPending,
      'approved' => L10n.statusApproved,
      _ => L10n.statusRejected,
    };

class MyPostsScreen extends StatefulWidget {
  const MyPostsScreen({super.key});
  @override
  State<MyPostsScreen> createState() => _MyPostsScreenState();
}

class _MyPostsScreenState extends State<MyPostsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<MyPostsNotifier>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<MyPostsNotifier>();
    final c = ThuieTheme.colorsOf(context);

    Widget list;
    switch (notifier.status) {
      case AsyncStatus.idle:
      case AsyncStatus.loading:
        list = const Center(child: ThuieLoader());
      case AsyncStatus.error:
        list = ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        );
      case AsyncStatus.ready:
        final mine = notifier.items;
        list = mine.isEmpty
            ? EmptyState(
                text: L10n.noPostsYet,
                icon: LucideIcons.messagesSquare,
                actionLabel: L10n.createPost,
                onAction: () => Navigator.of(context).pushNamed(Routes.postCreate),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(ThuieSpace.lg),
                itemCount: mine.length + (notifier.hasMore ? 1 : 0),
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  if (i >= mine.length) {
                    WidgetsBinding.instance
                        .addPostFrameCallback((_) => notifier.loadMore());
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Center(child: ThuieLoader()),
                    );
                  }
                  final post = mine[i];
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(ThuieRadii.md),
                      border: Border.all(color: c.hairline, width: 0.5),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(post.title, style: c.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis)),
                        StatusBadge(post.status),
                      ]),
                      if (post.status == ContentStatus.rejected && post.rejectReason != null) ...[
                        const SizedBox(height: 4),
                        Text('${L10n.rejectReasonPrefix}${post.rejectReason}', style: TextStyle(color: c.danger, fontSize: 12)),
                      ],
                      const SizedBox(height: 8),
                      Align(
                        alignment: Alignment.centerRight,
                        child: ThuieTextButton(
                          label: L10n.reviseAndResubmit,
                          fontSize: 13,
                          onTap: () => _showMyPostEditSheet(context, post),
                        ),
                      ),
                    ]),
                  );
                },
              );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.myPosts),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: SegmentedRow<String?>(
            options: _statusOptions,
            selected: notifier.statusFilter,
            label: _statusLabel,
            onSelect: (s) => notifier.setStatus(s),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => notifier.load(refresh: true),
            child: list,
          ),
        ),
      ]),
    );
  }
}

void _showMyPostEditSheet(BuildContext context, Post post) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _MyPostEditSheet(post: post),
  );
}

class _MyPostEditSheet extends StatefulWidget {
  final Post post;
  const _MyPostEditSheet({required this.post});
  @override
  State<_MyPostEditSheet> createState() => _MyPostEditSheetState();
}

class _MyPostEditSheetState extends State<_MyPostEditSheet> {
  late String _title = widget.post.title;
  late String _content = widget.post.content;
  String? _error;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.reviseAndResubmit, style: c.titleMedium),
          const SizedBox(height: 6),
          Text(L10n.editRepublishHint, style: TextStyle(fontSize: 12, color: c.muted, height: 1.4)),
          const SizedBox(height: 12),
          FlatField(value: _title, onChanged: (v) => _title = v, label: L10n.titleLabel),
          const SizedBox(height: 10),
          FlatField(value: _content, onChanged: (v) => _content = v, label: L10n.bodyLabel, singleLine: false, maxLines: 5),
          if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(
            label: L10n.submitLabel,
            onTap: _busy ? null : () async {
              setState(() { _busy = true; _error = null; });
              final forum = context.read<ForumNotifier>();
              final mine = context.read<MyPostsNotifier>();
              final messenger = ScaffoldMessenger.of(context);
              final navigator = Navigator.of(context);
              final updated = await forum.update(
                widget.post.id,
                title: _title.trim(),
                content: _content.trim(),
                version: widget.post.version,
              );
              if (!mounted) return;
              if (updated != null) {
                navigator.pop();
                mine.load(refresh: true);
                messenger.showSnackBar(SnackBar(
                    content: Text(L10n.editResubmittedToast), duration: const Duration(seconds: 1)));
              } else {
                final e = forum.error;
                setState(() {
                  _busy = false;
                  _error = e is ApiError ? L10n.describeApiError(e.code) : L10n.errGeneric;
                });
              }
            },
          ),
        ]),
      ),
    );
  }
}
