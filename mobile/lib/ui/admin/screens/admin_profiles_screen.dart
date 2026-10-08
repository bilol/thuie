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

/// §6.17 pending alumni-profile review queue
/// (`GET /admin/review?type=alumni_profile`); approve / reject via
/// `/admin/review/alumni_profile/:id/…`.
class AdminProfilesScreen extends StatefulWidget {
  const AdminProfilesScreen({super.key});
  @override
  State<AdminProfilesScreen> createState() => _AdminProfilesScreenState();
}

class _AdminProfilesScreenState extends State<AdminProfilesScreen> {
  final _notifier = AdminReviewNotifier(typeFilter: 'alumni_profile');

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
      child: const _AdminProfilesBody(),
    );
  }
}

class _AdminProfilesBody extends StatelessWidget {
  const _AdminProfilesBody();
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
          ? EmptyState(text: L10n.noPendingProfiles)
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
                final p = notifier.items[i];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    border: Border.all(color: c.hairline, width: 0.5),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Avatar(name: p.title, seed: p.targetId.hashCode, size: 40),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(p.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        MetaText('${p.authorName} · ${Fmt.relative(p.submittedAt)}'),
                      ])),
                      RoleBadge(p.authorRole),
                    ]),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(child: ThuieOutlinedButton(label: L10n.reject, onTap: () {
                        showAdminInputDialog(context, onConfirm: (r) {
                          notifier.reject(p.targetType, p.targetId, reason: r);
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reviewRejectedMsg), duration: const Duration(seconds: 1)));
                        });
                      })),
                      const SizedBox(width: 10),
                      Expanded(child: ThuieFilledButton(label: L10n.approve, onTap: () {
                        notifier.approve(p.targetType, p.targetId);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(L10n.reviewApprovedMsg), duration: const Duration(seconds: 1)));
                      })),
                    ]),
                  ]),
                );
              },
            ),
    };

    return ThuiePage(bar: ThuieBar(title: L10n.alumniReview), body: body);
  }
}
