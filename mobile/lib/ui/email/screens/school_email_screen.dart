import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/email_service.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/email_tile.dart';

class SchoolEmailScreen extends StatefulWidget {
  const SchoolEmailScreen({super.key});
  @override
  State<SchoolEmailScreen> createState() => _SchoolEmailScreenState();
}

class _SchoolEmailScreenState extends State<SchoolEmailScreen> {
  int _tab = 0;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      final service = context.read<EmailService>();
      if (!service.isConnected) {
        service.reconnect();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final service = context.watch<EmailService>();
    final user = context.watch<AuthSession>().user;
    if (user == null) return const SizedBox.shrink();
    final c = ThuieTheme.colorsOf(context);

    if (!service.isConnected && !service.isLoading) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.campusEmail),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(color: c.accentWeak, borderRadius: BorderRadius.circular(20)),
                child: Icon(LucideIcons.mail, size: 28, color: c.accent),
              ),
              const SizedBox(height: 16),
              Text(L10n.connectYourEmail, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.ink)),
              const SizedBox(height: 8),
              Text(L10n.supportedEmailProviders, textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: c.muted)),
              const SizedBox(height: 24),
              ThuieFilledButton(
                label: L10n.setupEmail,
                leading: Icon(LucideIcons.logIn, size: 16, color: c.onAccent),
                onTap: () => Navigator.of(context).pushNamed(Routes.emailSetup),
              ),
            ]),
          ),
        ),
      );
    }

    if (service.isLoading && service.inbox.isEmpty) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.campusEmail, actions: [
          ThuieIconButton(icon: LucideIcons.settings, size: 18, onTap: () => Navigator.of(context).pushNamed(Routes.emailSetup)),
        ]),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final emailAddr = service.account?.email ?? '';
    final tabs = [L10n.inbox, L10n.starred, L10n.sent, L10n.trash];
    final lists = [service.inbox, service.starred, service.sent, service.trash];
    final currentList = lists[_tab];

    return ThuiePage(
      bar: ThuieBar(title: L10n.campusEmail, actions: [
        ThuieIconButton(icon: LucideIcons.edit, size: 20, onTap: () => Navigator.of(context).pushNamed(Routes.emailCompose)),
        ThuieIconButton(icon: LucideIcons.refreshCw, size: 18, onTap: () => service.fetchInbox()),
        ThuieIconButton(icon: LucideIcons.settings, size: 18, onTap: () => Navigator.of(context).pushNamed(Routes.emailSetup)),
      ]),
      body: RefreshIndicator(
        onRefresh: () => service.fetchInbox(),
        child: Column(children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: c.accentWeak,
              border: Border(bottom: BorderSide(color: c.hairline, width: 0.5)),
            ),
            child: Row(children: [
              Icon(LucideIcons.mail, size: 15, color: c.accent),
              const SizedBox(width: 8),
              Expanded(child: Text(emailAddr, style: TextStyle(fontSize: 13, color: c.accent, fontWeight: FontWeight.w500))),
              if (service.unreadCount > 0) Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: c.danger, borderRadius: BorderRadius.circular(ThuieRadii.lg)),
                child: Text('${service.unreadCount}', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700)),
              ),
            ]),
          ),
          Container(
            decoration: BoxDecoration(
              color: c.surface,
              border: Border(bottom: BorderSide(color: c.hairline, width: 0.5)),
            ),
            child: Row(children: List.generate(tabs.length, (idx) {
              final count = idx == 0 ? service.unreadCount : null;
              return Expanded(child: _EmailTab(label: tabs[idx], count: count, selected: _tab == idx, onTap: () => setState(() => _tab = idx)));
            })),
          ),
          Expanded(child: currentList.isEmpty
            ? ListView(children: [SizedBox(height: MediaQuery.of(context).size.height * 0.3, child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(LucideIcons.inbox, size: 40, color: c.muted),
                const SizedBox(height: 8),
                Text(_tab == 3 ? L10n.trashEmpty : L10n.noEmails, style: TextStyle(fontSize: 14, color: c.muted)),
              ])))])
            : ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 2),
                itemCount: currentList.length,
                separatorBuilder: (_, __) => Divider(height: 0.5, color: c.hairline, indent: 16, endIndent: 16),
                itemBuilder: (_, i) {
                  final email = currentList[i];
                  return EmailTile(
                    email: email,
                    onToggleStar: () => service.toggleStar(email.id),
                    onDelete: () {
                      service.moveToTrash(email.id);
                      _snack(L10n.movedToTrash);
                    },
                    onArchive: () {
                      service.archive(email.id);
                      _snack(L10n.archived);
                    },
                    onToggleRead: () => service.markAsRead(email.id),
                  );
                },
              ),
          ),
        ]),
      ),
    );
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      duration: const Duration(seconds: 2),
    ));
  }
}

class _EmailTab extends StatelessWidget {
  final String label;
  final int? count;
  final bool selected;
  final VoidCallback onTap;
  const _EmailTab({required this.label, this.count, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: selected ? c.accent : Colors.transparent, width: 2)),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(label, style: TextStyle(fontSize: 13, fontWeight: selected ? FontWeight.w600 : FontWeight.w400, color: selected ? c.accent : c.muted)),
          if (count != null && count! > 0) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(color: c.danger, borderRadius: BorderRadius.circular(ThuieRadii.lg)),
              child: Text('$count', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ],
        ]),
      ),
    );
  }
}
