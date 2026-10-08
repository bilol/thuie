import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/mentorship_notifier.dart';
import '../../../data/remote/async_status.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class MentorshipScreen extends StatefulWidget {
  const MentorshipScreen({super.key});
  @override
  State<MentorshipScreen> createState() => _MentorshipScreenState();
}

class _MentorshipScreenState extends State<MentorshipScreen> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final notifier = context.read<MentorshipNotifier>();
      notifier.load();
      notifier.loadApplications(MentorshipRole.incoming);
      notifier.loadApplications(MentorshipRole.outgoing);
    });
  }

  (String, SealTone) _statusSeal(MentorshipStatus s) => switch (s) {
        MentorshipStatus.pending => (L10n.pendingConfirmLabel, SealTone.warn),
        MentorshipStatus.accepted => (L10n.applicationAccepted, SealTone.ok),
        MentorshipStatus.rejected => (L10n.applicationRejected, SealTone.danger),
        MentorshipStatus.withdrawn => (L10n.applicationCancelled, SealTone.neutral),
        MentorshipStatus.ended => (L10n.ended, SealTone.neutral),
      };

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    final notifier = context.watch<MentorshipNotifier>();
    final user = context.watch<AuthSession>().user;
    if (user == null) {
      return ThuiePage(bar: ThuieBar(title: L10n.mentorshipTitle), body: const SizedBox.shrink());
    }

    final menteeId = user.id;
    final myApps = notifier.applicationsOf(MentorshipRole.outgoing);
    final inbox = notifier.applicationsOf(MentorshipRole.incoming);
    // There is no GET /me/mentor-profile, so the client cannot know whether the
    // viewer is already a mentor; the review tab is always offered and
    // "become a mentor" is a submit-only action the server de-duplicates.
    final pendingInbox = inbox.where((a) => a.status == MentorshipStatus.pending).length;
    final otherMentors = notifier.items.where((m) => m.userId != menteeId).toList();

    return ThuiePage(
      bar: ThuieBar(title: L10n.mentorshipTitle),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [c.accent, c.accent.withAlpha(180)], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(ThuieRadii.lg),
            ),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                child: const Icon(LucideIcons.graduationCap, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(L10n.alumniMentorProgram, style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(L10n.mentorshipDescText, style: TextStyle(color: Colors.white70, fontSize: 12)),
              ])),
            ]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                _MentorTab(label: L10n.mentorListTab, selected: _tab == 0, onTap: () => setState(() => _tab = 0)),
                const SizedBox(width: 8),
                _MentorTab(label: L10n.myApplicationsTab, selected: _tab == 1, onTap: () => setState(() => _tab = 1)),
                const SizedBox(width: 8),
                _MentorTab(label: '${L10n.reviewApplicationsTab}${pendingInbox == 0 ? '' : ' ($pendingInbox)'}', selected: _tab == 2, onTap: () => setState(() => _tab = 2)),
              ]),
            ),
            if (user.role == Role.graduate) ...[
              const SizedBox(height: 8),
              ThuieTextButton(
                label: L10n.becomeMentor,
                fontSize: 13,
                onTap: () => _showMentorForm(context),
              ),
            ],
          ]),
        ),
        Expanded(child: switch (_tab) {
          2 => _inbox(notifier, c, inbox),
          1 => _myApplications(notifier, c, myApps),
          _ => _mentors(notifier, c, otherMentors, menteeId),
        }),
      ]),
    );
  }

  Widget _inbox(MentorshipNotifier notifier, ThuieColors c, List<MentorshipApplication> inbox) {
    if (notifier.isLoadingApplications(MentorshipRole.incoming)) {
      return const Center(child: ThuieLoader());
    }
    if (inbox.isEmpty) {
      return EmptyState(text: L10n.noMentorRequests, icon: LucideIcons.inbox);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ThuieSpace.lg),
      itemCount: inbox.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final app = inbox[i];
        final (sealLabel, sealTone) = _statusSeal(app.status);
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Avatar(name: app.menteeName, seed: app.menteeId.hashCode, size: 40),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(app.menteeName.isEmpty ? app.menteeId : app.menteeName, style: const TextStyle(fontWeight: FontWeight.w500)),
                MetaText(Fmt.relative(app.createdAt)),
              ])),
              Seal(text: sealLabel, tone: sealTone),
            ]),
            if (app.message.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(app.message, style: TextStyle(fontSize: 13, color: c.ink2, height: 1.4)),
            ],
            if (app.status == MentorshipStatus.pending && app.canRespond) ...[
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: ThuieOutlinedButton(small: true, label: L10n.ignoreLabel,
                  onTap: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    final ok = await notifier.respond(app.id, accept: false);
                    messenger.showSnackBar(SnackBar(content: Text(ok ? L10n.applicationRejectedMsg : L10n.actionError(notifier.error?.code)), duration: const Duration(seconds: 1)));
                  })),
                const SizedBox(width: 8),
                Expanded(child: ThuieFilledButton(small: true, label: L10n.acceptLabel,
                  onTap: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    // max_mentees is enforced server-side (409 when full).
                    final ok = await notifier.respond(app.id, accept: true);
                    messenger.showSnackBar(SnackBar(
                      content: Text(ok ? L10n.applicationAcceptedMsg : L10n.actionError(notifier.error?.code)),
                      duration: const Duration(seconds: 1),
                    ));
                  })),
              ]),
            ],
          ]),
        );
      },
    );
  }

  Widget _mentors(MentorshipNotifier notifier, ThuieColors c, List<MentorProfile> mentors, String menteeId) {
    switch (notifier.status) {
      case AsyncStatus.idle:
      case AsyncStatus.loading:
        return const Center(child: ThuieLoader());
      case AsyncStatus.error:
        return ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          actionLabel: L10n.retry,
          onAction: () => notifier.load(refresh: true),
        );
      case AsyncStatus.ready:
        if (mentors.isEmpty) {
          return EmptyState(text: L10n.noMentorRequests, icon: LucideIcons.users);
        }
        return PagedListView<MentorProfile>(
          items: mentors,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          onLoadMore: notifier.hasMore ? notifier.loadMore : null,
          hasMore: notifier.hasMore,
          isLoadingMore: notifier.loadingMore,
          itemBuilder: (_, m) {
            final programClass = [
              if (m.program.isNotEmpty) m.program,
              if (m.gradeYear.isNotEmpty) '${m.gradeYear}${L10n.classOfGrade}',
            ].join(' · ');
            // Tap opens the mentor detail (apply / cancel lives there now),
            // so the card is a navigation affordance, not a mutation button.
            return GestureDetector(
              onTap: () => Navigator.of(context).pushNamed(Routes.mentorDetail, arguments: m.userId),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(ThuieRadii.lg),
                  border: Border.all(color: c.hairline, width: 0.5),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Avatar(name: m.name, seed: m.id.hashCode, size: 44, imagePath: m.avatarUrl),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(m.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      if (programClass.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        MetaText(programClass),
                      ],
                    ])),
                    Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
                  ]),
                  const SizedBox(height: 10),
                  Wrap(spacing: 6, runSpacing: 4, children: [
                    if (m.mentorArea.isNotEmpty) Seal(text: m.mentorArea, tone: SealTone.ok),
                    Seal(text: m.active ? '${m.currentMentees}/${m.maxMentees}' : L10n.mentorPausedBadge, tone: m.active ? SealTone.neutral : SealTone.danger),
                  ]),
                  const SizedBox(height: 8),
                  Text(m.expertise, style: TextStyle(fontSize: 13, color: c.ink2, height: 1.4), maxLines: 3, overflow: TextOverflow.ellipsis),
                ]),
              ),
            );
          },
        );
    }
  }

  Widget _myApplications(MentorshipNotifier notifier, ThuieColors c, List<MentorshipApplication> myApps) {
    if (notifier.isLoadingApplications(MentorshipRole.outgoing)) {
      return const Center(child: ThuieLoader());
    }
    if (myApps.isEmpty) {
      return EmptyState(text: L10n.noApplicationsYet, icon: LucideIcons.inbox);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(ThuieSpace.lg),
      itemCount: myApps.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final app = myApps[i];
        final (sealLabel, sealTone) = _statusSeal(app.status);
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
            border: Border.all(color: c.hairline, width: 0.5),
          ),
          child: Row(children: [
            Avatar(name: app.mentorName, seed: app.mentorId.hashCode, size: 40),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(app.mentorName.isEmpty ? app.mentorId : app.mentorName, style: const TextStyle(fontWeight: FontWeight.w500)),
              MetaText(Fmt.relative(app.createdAt)),
            ])),
            Seal(text: sealLabel, tone: sealTone),
          ]),
        );
      },
    );
  }

  void _showMentorForm(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _MentorFormSheet(),
    );
  }
}

/// Become-a-mentor form (`POST /me/mentor-profile`). Verified graduates only;
/// there is no mentor read-back so this is submit-only.
class _MentorFormSheet extends StatefulWidget {
  const _MentorFormSheet();

  @override
  State<_MentorFormSheet> createState() => _MentorFormSheetState();
}

class _MentorFormSheetState extends State<_MentorFormSheet> {
  String _area = '';
  String _expertise = '';
  String _max = '3';
  String? _error;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(L10n.becomeMentor, style: c.titleMedium),
          const SizedBox(height: 12),
          FlatField(value: _area, onChanged: (v) => _area = v, label: L10n.mentorAreaLabel, placeholder: '${L10n.departmentLabel} / ${L10n.industryLabel}'),
          const SizedBox(height: 10),
          FlatField(value: _expertise, onChanged: (v) => _expertise = v, label: L10n.expertiseLabel, singleLine: false, maxLines: 3),
          const SizedBox(height: 10),
          FlatField(value: _max, onChanged: (v) => _max = v, label: L10n.maxMenteesLabel),
          if (_error != null) ...[const SizedBox(height: 8), Text(_error!, style: TextStyle(color: c.danger, fontSize: 13))],
          const SizedBox(height: 16),
          ThuieFilledButton(
            label: _busy ? L10n.save : L10n.save,
            onTap: _busy ? null : () async {
              final maxMentees = int.tryParse(_max) ?? 0;
              if (_area.trim().isEmpty || _expertise.trim().isEmpty || maxMentees < 1 || maxMentees > 20) {
                setState(() => _error = '${L10n.mentorAreaLabel} / ${L10n.expertiseLabel} / 1-20');
                return;
              }
              final navigator = Navigator.of(context);
              final messenger = ScaffoldMessenger.of(context);
              setState(() => _busy = true);
              final mentorship = context.read<MentorshipNotifier>();
              final created = await mentorship.becomeMentor(
                expertise: _expertise.trim(),
                mentorArea: _area.trim(),
                maxMentees: maxMentees,
              );
              if (!mounted) return;
              setState(() => _busy = false);
              if (created == null) {
                setState(() => _error = L10n.actionError(mentorship.error?.code));
                return;
              }
              navigator.pop();
              messenger.showSnackBar(SnackBar(content: Text(L10n.success), duration: const Duration(seconds: 1)));
            },
          ),
        ]),
      ),
    );
  }
}

class _MentorTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _MentorTab({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? c.accent : c.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? c.accent : c.hairline, width: 0.5),
        ),
        child: Text(label, style: TextStyle(
          fontSize: 13, fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          color: selected ? c.onAccent : c.ink2,
        )),
      ),
    );
  }
}
