import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../app_router.dart';
import '../../../data/notifiers/messaging_notifier.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/alumni_notifier.dart';
import '../../../data/notifiers/connections_notifier.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class AlumniDetailScreen extends StatefulWidget {
  final String id;
  const AlumniDetailScreen(this.id, {super.key});
  @override
  State<AlumniDetailScreen> createState() => _AlumniDetailScreenState();
}

class _AlumniDetailScreenState extends State<AlumniDetailScreen> {
  AlumniProfile? _profile;
  bool _loading = true;
  int _connectionCount = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ConnectionsNotifier>().loadAll();
      _load();
    });
  }

  Future<void> _load() async {
    final alumni = context.read<AlumniNotifier>();
    final p = await alumni.fetchOne(widget.id);
    if (!mounted) return;
    setState(() {
      _profile = p;
      _loading = false;
    });
    if (p != null) {
      final conns = await alumni.connectionsFor(p.id);
      if (mounted) setState(() => _connectionCount = conns.length);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthSession>().user;
    final c = ThuieTheme.colorsOf(context);
    if (user == null) return ThuiePage(body: Center(child: Text(L10n.pleaseLogin)));

    if (_loading) {
      return const ThuiePage(bar: ThuieBar(title: ''), body: Center(child: ThuieLoader()));
    }
    final p = _profile;
    // The server only returns approved, viewer-visible profiles; a null fetch
    // means the profile is gone or not visible to this viewer.
    if (p == null || p.status != ProfileStatus.approved) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.alumniDetail),
        body: ResultState(
          icon: LucideIcons.userX,
          title: L10n.resultUnavailable,
          message: L10n.profileNotFound,
          actionLabel: L10n.goBackAction,
        ),
      );
    }

    return ThuiePage(
      bar: ThuieBar(title: L10n.alumniDetail, actions: [
        ThuieIconButton(
          icon: LucideIcons.flag, size: 20,
          onTap: () => Navigator.of(context).pushNamed(Routes.report, arguments: ('profile', widget.id)),
        ),
        ThuieIconButton(
          icon: LucideIcons.share, size: 20,
          onTap: () {
            final shareText = '${p.displayName}\n${p.workTitle} @ ${p.company}\n\n— THUIE App';
            Share.share(shareText, subject: p.displayName);
          },
        ),
      ]),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Profile header with avatar, name, online status
          Row(children: [
            Avatar(name: p.displayName, seed: p.displayName.hashCode, size: 72, imagePath: p.avatarUrl),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Flexible(child: Text(p.displayName, style: c.titleLarge, overflow: TextOverflow.ellipsis)),
                if (p.source == ProfileSource.school) ...[const SizedBox(width: 6), const SchoolBadge()],
              ]),
              const SizedBox(height: 4),
              MetaText(p.workTitle.isNotEmpty ? '${p.workTitle}${p.company.isNotEmpty ? ' @ ${p.company}' : ''}' : L10n.noPositionInfo),
              if (p.nationality.isNotEmpty) ...[
                const SizedBox(height: 2),
                MetaText(p.nationality),
              ],
              if (p.city.isNotEmpty || p.country.isNotEmpty) ...[
                const SizedBox(height: 2),
                Row(children: [
                  Icon(LucideIcons.mapPin, size: 12, color: c.muted),
                  const SizedBox(width: 4),
                  Flexible(child: MetaText([
                    if (p.city.isNotEmpty) p.city,
                    if (p.country.isNotEmpty) p.country,
                  ].join(', '))),
                ]),
              ],
              const SizedBox(height: 6),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                // Only actionable once there are connections to show; a tap opens
                // the owner's accepted-connections list.
                onTap: _connectionCount > 0
                    ? () => Navigator.of(context).pushNamed(Routes.alumniConnections, arguments: p.id)
                    : null,
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('$_connectionCount ${L10n.connectionsSuffix}', style: TextStyle(fontSize: 12, color: c.accent, fontWeight: FontWeight.w500)),
                  if (_connectionCount > 0) ...[
                    const SizedBox(width: 2),
                    Icon(LucideIcons.chevronRight, size: 13, color: c.accent),
                  ],
                ]),
              ),
            ])),
          ]),

          // Action bar - connect, message
          if (p.userId != null && p.userId != user.id) ...[
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: _ConnectButton(profileUserId: p.userId!, currentUserId: user.id)),
              const SizedBox(width: 10),
              Expanded(child: GestureDetector(
                onTap: () async {
                  final navigator = Navigator.of(context);
                  final messenger = ScaffoldMessenger.of(context);
                  final messaging = context.read<MessagingNotifier>();
                  final convId = await messaging.conversationWith(p.userId!);
                  if (convId == null) {
                    messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(messaging.error?.code))));
                    return;
                  }
                  navigator.pushNamed(Routes.chatDetail, arguments: convId);
                },
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    border: Border.all(color: c.hairline, width: 0.5),
                  ),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(LucideIcons.mail, size: 16, color: c.accent),
                    const SizedBox(width: 6),
                    Text(L10n.sendMessage, style: TextStyle(fontSize: 13, color: c.accent, fontWeight: FontWeight.w600)),
                  ]),
                ),
              )),
            ]),
          ],

          // Bio
          if (p.bio.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(p.bio, style: c.bodyLarge),
          ],

          const SizedBox(height: 16),
          // Info card
          _ProfileSection(title: L10n.basicInfo, icon: LucideIcons.info, children: [
            _DetailRow(label: L10n.departmentLabel, value: p.department),
            if (p.program.isNotEmpty) _DetailRow(label: L10n.programShort, value: p.program),
            _DetailRow(label: L10n.classOfLabel, value: p.graduationYear != null ? '${p.graduationYear}${L10n.classOfSuffix}' : L10n.inSchoolLabel),
            if (p.nationality.isNotEmpty) _DetailRow(label: L10n.nationalityShort, value: p.nationality),
            if (p.company.isNotEmpty) _DetailRow(label: L10n.companyShort, value: p.company),
            if (p.industry.isNotEmpty) _DetailRow(label: L10n.industryShort, value: p.industry),
          ]),

          // Skills section
          if (p.skills.isNotEmpty) ...[
            const SizedBox(height: 16),
            _ProfileSection(title: L10n.skills, icon: LucideIcons.award, children: [
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final skill in p.skills)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: c.accentWeak,
                      borderRadius: BorderRadius.circular(ThuieRadii.full),
                      border: Border.all(color: c.accent.withAlpha(60), width: 0.5),
                    ),
                    child: Text(skill, style: TextStyle(fontSize: 12, color: c.accent, fontWeight: FontWeight.w500)),
                  ),
              ]),
            ]),
          ],

          // Social accounts with icons
          if (p.wechat.isNotEmpty || p.whatsapp.isNotEmpty || p.linkedin.isNotEmpty) ...[
            const SizedBox(height: 16),
            _ProfileSection(title: L10n.socialAccountsLabel, icon: LucideIcons.share2, children: [
              if (p.wechat.isNotEmpty) _SocialRow(icon: LucideIcons.messageCircle, label: L10n.wechatShort, value: p.wechat, color: const Color(0xFF07C160)),
              if (p.whatsapp.isNotEmpty) _SocialRow(icon: LucideIcons.phone, label: 'WhatsApp', value: p.whatsapp, color: const Color(0xFF25D366)),
              if (p.linkedin.isNotEmpty) _SocialRow(icon: LucideIcons.link, label: 'LinkedIn', value: p.linkedin, color: const Color(0xFF0A66C2)),
            ]),
          ],
        ]),
      ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;
  const _ProfileSection({required this.title, required this.icon, required this.children});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(ThuieSpace.lg),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(ThuieRadii.md),
        border: Border.all(color: c.hairline, width: 0.5),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 15, color: c.accent),
          const SizedBox(width: 8),
          Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: c.ink)),
        ]),
        const SizedBox(height: 12),
        ...children,
      ]),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label, value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 88, child: Text(label, style: TextStyle(fontSize: 13, color: c.muted))),
        const SizedBox(width: 8),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }
}

class _SocialRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _SocialRow({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(children: [
        Container(
          width: 28, height: 28,
          decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(ThuieRadii.sm)),
          child: Icon(icon, size: 14, color: color),
        ),
        const SizedBox(width: 10),
        Text(label, style: TextStyle(fontSize: 13, color: c.muted)),
        const SizedBox(width: 8),
        Expanded(child: Text(value, style: TextStyle(fontSize: 13, color: c.ink, fontWeight: FontWeight.w500))),
      ]),
    );
  }
}

class _ConnectButton extends StatelessWidget {
  final String profileUserId;
  final String currentUserId;
  const _ConnectButton({required this.profileUserId, required this.currentUserId});

  @override
  Widget build(BuildContext context) {
    final connections = context.watch<ConnectionsNotifier>();
    final isConnected = connections.isConnectedWith(profileUserId);
    final hasPending = connections.hasPendingOutgoingTo(profileUserId);
    final c = ThuieTheme.colorsOf(context);

    if (isConnected) {
      return Container(
        height: 40,
        decoration: BoxDecoration(
          color: c.okWeak,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(LucideIcons.userCheck, size: 16, color: c.ok),
          const SizedBox(width: 6),
          Text(L10n.connectedLabel, style: TextStyle(fontSize: 13, color: c.ok, fontWeight: FontWeight.w600)),
        ]),
      );
    }
    if (hasPending) {
      final pending = connections.pendingOutgoingTo(profileUserId);
      return GestureDetector(
        onTap: pending == null
            ? null
            : () {
                final messenger = ScaffoldMessenger.of(context);
                showThuieConfirm(
                  context,
                  title: L10n.cancelRequestLabel,
                  body: L10n.cancelRequestConfirm,
                  destructive: true,
                  onConfirm: () async {
                    final ok = await connections.respond(pending, ConnectionStatus.revoked);
                    if (!messenger.mounted) return;
                    messenger.showSnackBar(SnackBar(
                      content: Text(ok ? L10n.requestWithdrawnMsg : L10n.actionError(connections.error?.code)),
                      duration: const Duration(seconds: 2),
                    ));
                  },
                );
              },
        child: Container(
          height: 40,
          decoration: BoxDecoration(
            color: c.warnWeak,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(LucideIcons.clock, size: 16, color: c.warn),
            const SizedBox(width: 6),
            Text(L10n.pendingConfirmLabel, style: TextStyle(fontSize: 13, color: c.warn, fontWeight: FontWeight.w600)),
            const SizedBox(width: 4),
            Icon(LucideIcons.x, size: 14, color: c.warn),
          ]),
        ),
      );
    }
    return GestureDetector(
      onTap: () async {
        ThuieHaptics.connect();
        final messenger = ScaffoldMessenger.of(context);
        final sent = await connections.send(profileUserId);
        if (sent == null) {
          messenger.showSnackBar(SnackBar(content: Text(L10n.actionError(connections.error?.code)), duration: const Duration(seconds: 2)));
          return;
        }
        messenger.showSnackBar(
          SnackBar(content: Text(L10n.connectionSentMsg), duration: const Duration(seconds: 1)),
        );
      },
      child: Container(
        height: 40,
        decoration: BoxDecoration(
          color: c.accent,
          borderRadius: BorderRadius.circular(ThuieRadii.md),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(LucideIcons.userPlus, size: 16, color: Colors.white),
          const SizedBox(width: 6),
          Text(L10n.connectLabel, style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
