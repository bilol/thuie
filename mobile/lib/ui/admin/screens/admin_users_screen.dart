import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/admin_users_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/async_status.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

/// §6.17 student / graduate directory (`GET /admin/users?role=student|graduate`,
/// offset paged). Tapping a row opens the detail screen (which pops `true` after
/// a conversion, triggering a refresh); a long-press or the app-bar toggle enters
/// multi-select for bulk convert / ban / restore.
class AdminUsersScreen extends StatefulWidget {
  final String roleStr;
  const AdminUsersScreen(this.roleStr, {super.key});
  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  late final AdminUsersNotifier _notifier;

  bool _selectionMode = false;
  bool _busy = false;
  final Set<String> _selected = {};

  bool get _isGraduate => widget.roleStr == 'GRADUATE';

  @override
  void initState() {
    super.initState();
    _notifier = AdminUsersNotifier(roleFilter: _isGraduate ? 'graduate' : 'student');
    WidgetsBinding.instance.addPostFrameCallback((_) => _notifier.load());
  }

  @override
  void dispose() {
    _notifier.dispose();
    super.dispose();
  }

  void _enterSelection() => setState(() => _selectionMode = true);

  void _exitSelection() => setState(() {
        _selectionMode = false;
        _selected.clear();
      });

  void _toggleSelectAll(AdminUsersNotifier notifier) {
    setState(() {
      if (_selected.length == notifier.items.length) {
        _selected.clear();
      } else {
        _selected.addAll(notifier.items.map((u) => u.id));
      }
    });
  }

  void _toggleSelect(String id) {
    setState(() {
      if (_selected.contains(id)) {
        _selected.remove(id);
        if (_selected.isEmpty) _selectionMode = false;
      } else {
        _selected.add(id);
      }
    });
  }

  Future<void> _onRowTap(User u) async {
    if (_selectionMode) {
      _toggleSelect(u.id);
      return;
    }
    final changed = await Navigator.of(context).pushNamed(Routes.adminUserDetail, arguments: u);
    if (changed == true) await _notifier.reload();
  }

  Future<void> _runBulk(Future<bool> Function() action, String successMsg) async {
    if (_selected.isEmpty || _busy) return;
    setState(() => _busy = true);
    final ok = await action();
    if (!mounted) return;
    setState(() => _busy = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok ? successMsg : L10n.actionError(_notifier.error?.code)),
      duration: const Duration(seconds: 2),
    ));
    _exitSelection();
  }

  void _bulkConvert() => _runBulk(
        () => _notifier.batchConvert(
            _selected.map((id) => <String, dynamic>{'user_id': id}).toList()),
        L10n.bulkConvertDone,
      );

  void _bulkRestore() => _runBulk(
        () => _notifier.bulkUpdateStatus(_selected.toList(), UserStatus.active),
        L10n.bulkRestoreDone,
      );

  void _confirmBan() {
    if (_selected.isEmpty || _busy) return;
    showThuieConfirm(
      context,
      title: L10n.ban,
      body: L10n.banConfirmBody,
      confirmLabel: L10n.ban,
      destructive: true,
      onConfirm: () => _runBulk(
        () => _notifier.bulkUpdateStatus(_selected.toList(), UserStatus.banned),
        L10n.bulkBanDone,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AdminUsersNotifier>.value(
      value: _notifier,
      child: Consumer<AdminUsersNotifier>(
        builder: (context, notifier, _) {
          final c = ThuieTheme.colorsOf(context);
          final empty = _selected.isEmpty;

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
                ? EmptyState(text: L10n.noData)
                : _list(notifier, c),
          };

          return ThuiePage(
            bar: ThuieBar(
              title: _selectionMode ? L10n.selectedCount(_selected.length) : (_isGraduate ? L10n.graduateManagement : L10n.studentManagement),
              actions: _barActions(notifier, c),
            ),
            body: body,
            bottomBar: (_selectionMode && notifier.isReady && notifier.items.isNotEmpty)
                ? _bulkBar(c, empty)
                : null,
          );
        },
      ),
    );
  }

  List<Widget> _barActions(AdminUsersNotifier notifier, ThuieColors c) {
    if (_selectionMode) {
      final allSelected = notifier.items.isNotEmpty && _selected.length == notifier.items.length;
      return [
        // Toggle is always select-all / deselect-all; exit stays the single `x`
        // so selection mode never shows two close icons.
        ThuieIconButton(
          icon: LucideIcons.checkCheck,
          size: 20,
          tooltip: allSelected ? L10n.deselectAll : L10n.selectAll,
          onTap: () => _toggleSelectAll(notifier),
        ),
        ThuieIconButton(
          icon: LucideIcons.x,
          size: 20,
          tooltip: L10n.exitSelection,
          onTap: _exitSelection,
        ),
      ];
    }
    final canSelect = notifier.isReady && notifier.items.isNotEmpty;
    return [
      if (canSelect)
        ThuieIconButton(
          icon: LucideIcons.listChecks,
          size: 20,
          tooltip: L10n.selectMode,
          onTap: _enterSelection,
        ),
    ];
  }

  Widget _list(AdminUsersNotifier notifier, ThuieColors c) {
    return ListView.separated(
      padding: const EdgeInsets.all(ThuieSpace.lg),
      itemCount: notifier.items.length + (notifier.hasMorePages ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (_, i) {
        if (i >= notifier.items.length) {
          return Center(
            child: TextButton(
              onPressed: notifier.loadMore,
              child: Text(L10n.loadMore, style: TextStyle(fontSize: 12, color: c.muted)),
            ),
          );
        }
        final u = notifier.items[i];
        final selected = _selected.contains(u.id);
        return GestureDetector(
          onTap: () => _onRowTap(u),
          onLongPress: _selectionMode ? null : () { _enterSelection(); _toggleSelect(u.id); },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? c.accentWeak : c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.sm),
              border: Border.all(color: selected ? c.accent : c.hairline, width: 0.5),
            ),
            child: Row(children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 150),
                child: _selectionMode
                    ? Icon(
                        selected ? LucideIcons.checkCircle2 : LucideIcons.circle,
                        size: 22,
                        color: selected ? c.accent : c.muted,
                        key: ValueKey('sel-$selected'),
                      )
                    : Avatar(name: u.name, seed: u.avatarSeed, size: 36, key: const ValueKey('av')),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(u.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                MetaText(u.department),
              ])),
              RoleBadge(u.role),
            ]),
          ),
        );
      },
    );
  }

  Widget _bulkBar(ThuieColors c, bool empty) {
    final enabled = !empty && !_busy;
    Color tone(Color active) => enabled ? active : c.muted;
    return Material(
      color: c.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(children: [
            if (_busy) ...[
              const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              const SizedBox(width: 10),
            ],
            Text(L10n.selectedCount(_selected.length), style: TextStyle(fontSize: 13, color: c.ink)),
            const Spacer(),
            if (!_isGraduate)
              ThuieIconButton(
                icon: LucideIcons.graduationCap,
                size: 20,
                color: tone(c.accent),
                tooltip: L10n.convertToGraduate,
                onTap: enabled ? _bulkConvert : null,
              ),
            ThuieIconButton(
              icon: LucideIcons.ban,
              size: 20,
              color: tone(c.danger),
              tooltip: L10n.ban,
              onTap: enabled ? _confirmBan : null,
            ),
            ThuieIconButton(
              icon: LucideIcons.rotateCcw,
              size: 20,
              color: tone(c.ok),
              tooltip: L10n.restore,
              onTap: enabled ? _bulkRestore : null,
            ),
          ]),
        ),
      ),
    );
  }
}
