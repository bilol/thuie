import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../data/models.dart';
import '../data/notifiers/messaging_notifier.dart';
import '../data/notifiers/notifications_notifier.dart';
import '../data/session/auth_session.dart';
import '../l10n.dart';
import 'theme/thuie_theme.dart';
import 'components/common.dart';
import 'home/screens/home_screen.dart';
import 'info/screens/info_screens.dart';
import 'alumni/screens/alumni_screens.dart';
import 'forum/screens/forum_screens.dart';
import 'me/screens/me_screens.dart';
import '../app_router.dart';

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});
  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsNotifier>().load();
    });
  }

  void _openSlot(int slot) {
    // Map a canonical slot requested by HomeScreen (0 home · 1 info · 2 alumni
    // · 3 forum · 4 me) to its position among the currently visible tabs.
    final st = context.read<AuthSession>().roleStrategy ?? const RoleStrategy();
    final enabled = <int>[
      0,
      if (st.canViewInfo) 1,
      if (st.canViewAlumni) 2,
      if (st.canViewForum) 3,
      4,
    ];
    final idx = enabled.indexOf(slot);
    setState(() => _currentIndex = idx < 0 ? 0 : idx);
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final user = session.user;
    if (user == null) return const SizedBox.shrink();

    final c = ThuieTheme.colorsOf(context);
    final st = session.roleStrategy ?? const RoleStrategy();
    final unread = context.watch<NotificationsNotifier>().unreadCount;
    final chatUnread = context.watch<MessagingNotifier>().totalUnread;

    // Role strategy hides tabs that the identity cannot reach, instead of
    // showing an empty tab (PRD 7.1: no silent degradation).
    final tabs = <_MainTab>[
      _MainTab(0, L10n.home, LucideIcons.home, true, () => HomeScreen(onOpenTab: _openSlot)),
      _MainTab(1, L10n.info, LucideIcons.fileText, st.canViewInfo, () => const InfoListScreen()),
      _MainTab(2, L10n.alumni, LucideIcons.users, st.canViewAlumni, () => const AlumniListScreen()),
      _MainTab(3, L10n.forum, LucideIcons.messageSquare, st.canViewForum, () => const ForumScreen()),
      _MainTab(4, L10n.me, LucideIcons.user, true, () => const PersonalCentreScreen()),
    ].where((t) => t.enabled).toList();

    final safeIndex = _currentIndex < tabs.length ? _currentIndex : 0;
    final current = tabs[safeIndex];
    final isMe = current.slot == 4;

    return Material(
      color: c.paper,
      child: SafeArea(
        bottom: false,
        child: Column(children: [
          Container(
            width: double.infinity,
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: c.surface,
              border: Border(bottom: BorderSide(color: c.hairline, width: 0.5)),
            ),
            child: Row(children: [
              Text(current.label, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: c.ink)),
              const Spacer(),
              if (!isMe) ...[
                if (current.slot == 0)
                  ThuieIconButton(icon: LucideIcons.search, size: 20, tooltip: L10n.search, onTap: () => Navigator.of(context).pushNamed(Routes.search)),
                ThuieBadge(count: chatUnread, child: ThuieIconButton(
                  icon: LucideIcons.mail, size: 20, tooltip: L10n.messages,
                  color: chatUnread > 0 ? c.accent : c.ink2,
                  onTap: () => Navigator.of(context).pushNamed(Routes.chatList),
                )),
                ThuieBadge(count: unread, child: ThuieIconButton(
                  icon: LucideIcons.bell, size: 20, tooltip: L10n.notifications,
                  color: unread > 0 ? c.accent : c.ink2,
                  onTap: () => Navigator.of(context).pushNamed(Routes.notifications),
                )),
              ],
              if (isMe) ...[
                ThuieIconButton(icon: LucideIcons.settings, size: 20, tooltip: L10n.settings, onTap: () => Navigator.of(context).pushNamed(Routes.settings)),
                const SizedBox(width: 4),
                _MeMoreButton(user: user),
              ],
            ]),
          ),
          Expanded(child: current.builder()),
          _ThuieBottomBar(
            tabs: tabs,
            current: safeIndex,
            onSelect: (i) => setState(() => _currentIndex = i),
          ),
        ]),
      ),
    );
  }
}

/// A single bottom-navigation tab: canonical slot, label, icon, whether the
/// current role can see it, and a lazy page builder.
class _MainTab {
  final int slot;
  final String label;
  final IconData icon;
  final bool enabled;
  final Widget Function() builder;
  const _MainTab(this.slot, this.label, this.icon, this.enabled, this.builder);
}

class _ThuieBottomBar extends StatelessWidget {
  final List<_MainTab> tabs;
  final int current;
  final ValueChanged<int> onSelect;

  const _ThuieBottomBar({required this.tabs, required this.current, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ThuieDivider(),
          SizedBox(
            height: ThuieSpace.rowOneLine,
          child: Row(
            children: List.generate(tabs.length, (i) {
              final tab = tabs[i];
              final selected = current == i;
              return Expanded(
                child: Semantics(
                  button: true,
                  selected: selected,
                  label: tab.label,
                  child: GestureDetector(
                  onTap: () => onSelect(i),
                  behavior: HitTestBehavior.opaque,
                  child: ExcludeSemantics(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(width: 18, height: 1.5, color: selected ? c.accent : const Color(0x00000000)),
                      const SizedBox(height: 7),
                      Icon(tab.icon,
                          size: 19, color: selected ? c.accent : c.muted),
                      const SizedBox(height: 3),
                      Text(tab.label,
                          style: TextStyle(
                              fontSize: 12, height: 1.25,
                              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                              color: selected ? c.accent : c.muted)),
                    ],
                  ),
                  ),
                ),
                ),
              );
            }),
          ),
        ),
      ],
    ));
  }
}

class _MeMoreButton extends StatelessWidget {
  final User user;
  const _MeMoreButton({required this.user});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Semantics(
      button: true,
      label: L10n.moreOptions,
      child: GestureDetector(
      onTap: () {
        showThuieBottomSheet(context, builder: (_) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              _MoreItem(icon: LucideIcons.penLine, label: L10n.editProfile, onTap: () {
                Navigator.pop(context);
                Navigator.of(context).pushNamed(Routes.editProfile);
              }),
              _MoreItem(icon: LucideIcons.qrCode, label: L10n.myQrCode, onTap: () {
                Navigator.pop(context);
                Navigator.of(context).pushNamed(Routes.qrCode);
              }),
              _MoreItem(icon: LucideIcons.scan, label: L10n.scanQrCode, onTap: () {
                Navigator.pop(context);
                Navigator.of(context).pushNamed(Routes.qrScan);
              }),
              _MoreItem(icon: LucideIcons.helpCircle, label: L10n.permissionGuideTitle, onTap: () {
                Navigator.pop(context);
                Navigator.of(context).pushNamed(Routes.permissionGuide);
              }),
            ]),
          );
        });
      },
      child: ExcludeSemantics(
      child: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color: c.surfaceSunken,
          borderRadius: BorderRadius.circular(ThuieRadii.lg)
        ),
        child: Icon(LucideIcons.moreHorizontal, size: 20, color: c.ink2),
      ),
      ),
    ),
    );
  }
}

class _MoreItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MoreItem({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Semantics(
      button: true,
      label: label,
      child: ExcludeSemantics(
        child: GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: c.accent.withAlpha(15), borderRadius: BorderRadius.circular(ThuieRadii.lg)),
            child: Icon(icon, size: 20, color: c.accent),
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(label, style: TextStyle(fontSize: 15, color: c.ink))),
          Icon(LucideIcons.chevronRight, size: 16, color: c.muted),
        ]),
      ),
        ),
      ),
    );
  }
}
