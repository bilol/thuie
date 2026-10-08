import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../data/notifiers/admin_review_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/admin_dialogs.dart';

/// §6.17 pending campus-info review queue (`GET /admin/review?type=info_post`).
/// Approve / reject write back through `/admin/review/info_post/:id/…`.
class AdminInfoListScreen extends StatefulWidget {
  const AdminInfoListScreen({super.key});
  @override
  State<AdminInfoListScreen> createState() => _AdminInfoListScreenState();
}

class _AdminInfoListScreenState extends State<AdminInfoListScreen> {
  final _notifier = AdminReviewNotifier(typeFilter: 'info_post');

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
    return ChangeNotifierProvider<AdminReviewNotifier>.value(
      value: _notifier,
      child: const _AdminInfoListBody(),
    );
  }
}

class _AdminInfoListBody extends StatelessWidget {
  const _AdminInfoListBody();
  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<AdminReviewNotifier>();
    final c = ThuieTheme.colorsOf(context);

    final body = switch (notifier.status) {
      AsyncStatus.idle || AsyncStatus.loading => const Center(child: ThuieLoader()),
      AsyncStatus.error => ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          message: notifier.error is ApiError
              ? L10n.describeApiError((notifier.error as ApiError).code)
              : null,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        ),
      AsyncStatus.ready => notifier.items.isEmpty
          ? EmptyState(text: L10n.noPendingReview)
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
                final item = notifier.items[i];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    border: Border.all(color: c.hairline, width: 0.5),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [RoleBadge(item.authorRole), const Spacer(),
                      MetaText(Fmt.relative(item.submittedAt))]),
                    const SizedBox(height: 6),
                    Text(item.title, style: c.titleMedium),
                    const SizedBox(height: 4),
                    MetaText(item.authorName),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: ThuieOutlinedButton(label: L10n.reject, onTap: () {
                        showAdminInputDialog(context, onConfirm: (r) {
                          notifier.reject(item.targetType, item.targetId, reason: r);
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reviewRejectedMsg), duration: const Duration(seconds: 1)));
                        });
                      })),
                      const SizedBox(width: 10),
                      Expanded(child: ThuieFilledButton(label: L10n.approve, onTap: () {
                        notifier.approve(item.targetType, item.targetId);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reviewApprovedMsg), duration: const Duration(seconds: 1)));
                      })),
                    ]),
                  ]),
                );
              },
            ),
    };

    return ThuiePage(bar: ThuieBar(title: L10n.infoReview), body: body);
  }
}
