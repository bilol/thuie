import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/alumni_notifier.dart';
import '../../../data/notifiers/connections_notifier.dart';
import '../../../data/notifiers/favorites_notifier.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../data/remote/api_error.dart';
import '../../../data/remote/media_uploader.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';
import '../widgets/card_menu.dart';

class PersonalCentreScreen extends StatefulWidget {
  const PersonalCentreScreen({super.key});
  @override
  State<PersonalCentreScreen> createState() => _PersonalCentreScreenState();
}

class _PersonalCentreScreenState extends State<PersonalCentreScreen> {
  final _picker = ImagePicker();
  AlumniProfile? _profile;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final user = context.read<AuthSession>().user;
    if (user == null) return;
    final alumni = context.read<AlumniNotifier>();
    final infos = context.read<InfosNotifier>();
    final forum = context.read<ForumNotifier>();
    final favorites = context.read<FavoritesNotifier>();
    final connections = context.read<ConnectionsNotifier>();
    final profile = await alumni.loadOwn();
    if (!mounted) return;
    setState(() => _profile = profile);
    await infos.load();
    await forum.load();
    await favorites.load();
    await connections.load(ConnectionBox.accepted);
  }

  Future<void> _pickAvatar() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null || !mounted) return;
    final session = context.read<AuthSession>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      final media = await MediaUploader.instance.upload(file, kind: MediaKind.avatar);
      if (media == null) {
        messenger.showSnackBar(SnackBar(content: Text(L10n.errGeneric)));
        return;
      }
      await session.updateProfile({'avatar_media_id': media.id});
    } on ApiError catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(L10n.describeApiError(e.code))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final user = session.user;
    if (user == null) return const SizedBox.shrink();
    final c = ThuieTheme.colorsOf(context);

    final infos = context.watch<InfosNotifier>().items;
    final posts = context.watch<ForumNotifier>().items;
    final myInfoCount = infos.where((i) => i.authorId == user.id).length;
    final myPostCount = posts.where((p) => p.authorId == user.id).length;
    final favCount = context.watch<FavoritesNotifier>().items.length;
    final connCount = context.watch<ConnectionsNotifier>().accepted.length;

    return ListView(
      padding: const EdgeInsets.only(bottom: 20),
      children: [
        // Profile header card
        Container(
          margin: const EdgeInsets.all(ThuieSpace.lg),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(ThuieRadii.lg),
            gradient: LinearGradient(
              colors: [c.accent, c.accent.withAlpha(180)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(children: [
            Row(children: [
              GestureDetector(
                onTap: _pickAvatar,
                child: Stack(children: [
                  Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white30, width: 2),
                    ),
                    child: Avatar(name: user.name, seed: user.avatarSeed, size: 60, imagePath: user.avatarUrl),
                  ),
                  Positioned(
                    bottom: 0, right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white30, width: 1),
                      ),
                      child: const Icon(LucideIcons.camera, size: 14, color: Colors.white),
                    ),
                  ),
                ]),
              ),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(user.name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(switch (user.role) {
                      Role.student => L10n.roleStudent,
                      Role.graduate => L10n.roleGraduate,
                      _ => L10n.roleAdmin,
                    },
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                  ),
                ]),
                const SizedBox(height: 4),
                Text(user.department, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                if (user.gradeYear != null || user.graduationYear != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    user.graduationYear != null ? '${user.graduationYear}${L10n.classOfSuffix}' : '${user.gradeYear}${L10n.classOfGrade}',
                    style: const TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                ],
              ])),
            ]),
            const SizedBox(height: 20),
            Builder(builder: (_) {
              final profile = _profile;
              final completion = profile?.completionPercent ?? 0;
              return Column(children: [
                Row(children: [
                  Text(L10n.profileCompletion, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const Spacer(),
                  Text('$completion%', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ]),
                const SizedBox(height: 4),
                Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: FractionallySizedBox(
                    widthFactor: completion / 100,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ),
              ]);
            }),
            const SizedBox(height: 12),
            Row(children: [
              _StatItem(label: L10n.info, value: '$myInfoCount', onTap: () => Navigator.of(context).pushNamed(Routes.myInfos)),
              Container(width: 0.5, height: 30, color: Colors.white24),
              _StatItem(label: L10n.threads, value: '$myPostCount', onTap: () => Navigator.of(context).pushNamed(Routes.myPosts)),
              Container(width: 0.5, height: 30, color: Colors.white24),
              _StatItem(label: L10n.favorites, value: '$favCount', onTap: () => Navigator.of(context).pushNamed(Routes.favorites)),
            ]),
          ]),
        ),

        // Quick actions grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Row(children: [
              _QuickAction(icon: LucideIcons.calendar, label: L10n.eventsLabel, color: c.accent,
                onTap: () => Navigator.of(context).pushNamed(Routes.events)),
              _QuickAction(icon: LucideIcons.calendarRange, label: L10n.calendarLabel, color: c.warn,
                onTap: () => Navigator.of(context).pushNamed(Routes.schoolCalendar)),
              // Mentorship is a student↔graduate programme; staff/admins don't
              // take part, so hide the entry (and its application/request tabs).
              if (!session.isAdmin)
                _QuickAction(icon: LucideIcons.graduationCap, label: L10n.mentorLabel, color: c.ok,
                  onTap: () => Navigator.of(context).pushNamed(Routes.mentorship)),
              _QuickAction(icon: LucideIcons.mail, label: L10n.emailQuickAction, color: c.bronze,
                onTap: () => Navigator.of(context).pushNamed(Routes.schoolEmail)),
              _QuickAction(icon: LucideIcons.messageSquare, label: L10n.messagesLabel, color: c.danger,
                onTap: () => Navigator.of(context).pushNamed(Routes.chatList)),
              // Admins reach the console here now that it is no longer a bottom tab.
              if (session.isAdmin)
                _QuickAction(icon: LucideIcons.shield, label: L10n.adminTab, color: c.accent,
                  onTap: () => Navigator.of(context).pushNamed(Routes.adminHome)),
            ]),
          ),
        ),

        const SizedBox(height: 16),

        // Content section
        SectionHeader(title: L10n.myContent),
        CardMenu(items: [
          CardMenuItem(icon: LucideIcons.fileText, label: L10n.myInfos, subtitle: '$myInfoCount ${L10n.infoCountSuffix}', color: c.accent,
            onTap: () => Navigator.of(context).pushNamed(Routes.myInfos)),
          CardMenuItem(icon: LucideIcons.penLine, label: L10n.myPosts, subtitle: '$myPostCount ${L10n.infoCountSuffix}', color: c.ok,
            onTap: () => Navigator.of(context).pushNamed(Routes.myPosts)),
          CardMenuItem(icon: LucideIcons.messageSquare, label: L10n.myComments, color: c.bronze,
            onTap: () => Navigator.of(context).pushNamed(Routes.myComments)),
          CardMenuItem(icon: LucideIcons.bookmark, label: L10n.myFavorites, subtitle: '$favCount ${L10n.itemsSuffix}', color: c.warn,
            onTap: () => Navigator.of(context).pushNamed(Routes.favorites)),
          CardMenuItem(icon: LucideIcons.userPlus, label: L10n.myConnections, subtitle: '$connCount ${L10n.itemsSuffix}', color: c.accent,
            onTap: () => Navigator.of(context).pushNamed(Routes.connections)),
        ]),

        const SizedBox(height: 16),

        // Logout button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: GestureDetector(
            onTap: () => showThuieConfirm(context,
              title: L10n.logout,
              body: L10n.logoutConfirm,
              confirmLabel: L10n.logout,
              destructive: true,
              onConfirm: () {
                context.read<AuthSession>().logout();
                Navigator.of(context).pushNamedAndRemoveUntil(Routes.login, (_) => false);
              },
            ),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: c.dangerWeak,
                borderRadius: BorderRadius.circular(ThuieRadii.md),
                border: Border.all(color: c.danger.withAlpha(40), width: 0.5),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(LucideIcons.logOut, size: 18, color: c.danger),
                const SizedBox(width: 8),
                Text(L10n.logout, style: TextStyle(color: c.danger, fontSize: 15, fontWeight: FontWeight.w600)),
              ]),
            ),
          ),
        ),
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label, value;
  final VoidCallback onTap;
  const _StatItem({required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(children: [
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ]),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        behavior: HitTestBehavior.opaque,
        child: Column(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(fontSize: 12, color: c.ink2)),
        ]),
      ),
    );
  }
}
