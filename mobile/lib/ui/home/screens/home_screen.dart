import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/alumni_notifier.dart';
import '../../../data/notifiers/events_notifier.dart';
import '../../../data/notifiers/faculty_notifier.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/notifiers/infos_notifier.dart';
import '../../../data/session/auth_session.dart';
import '../../theme/thuie_theme.dart';
import '../../components/common.dart';
import '../../../app_router.dart';
import '../../../l10n.dart';
import '../../events/screens/events_screens.dart';

class HomeScreen extends StatefulWidget {
  final void Function(int) onOpenTab;
  const HomeScreen({super.key, required this.onOpenTab});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAll());
  }

  void _loadAll({bool refresh = false}) {
    context.read<InfosNotifier>().load(refresh: refresh);
    context.read<ForumNotifier>().load(refresh: refresh);
    context.read<AlumniNotifier>().load(refresh: refresh);
    context.read<EventsNotifier>().load(refresh: refresh);
    context.read<FacultyNotifier>().load(refresh: refresh);
  }

  Future<void> _refresh() async {
    _loadAll(refresh: true);
    await Future.delayed(const Duration(milliseconds: 400));
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthSession>().user;
    if (user == null) return const SizedBox.shrink();
    final c = ThuieTheme.colorsOf(context);
    final role = user.role;
    final posts = context.watch<ForumNotifier>().items.take(3).toList();
    final profiles = [...context.watch<AlumniNotifier>().items]
      ..sort((a, b) => (b.source == ProfileSource.school ? 1 : 0).compareTo(a.source == ProfileSource.school ? 1 : 0));
    final topProfiles = profiles.take(4).toList();
    final upcomingEvents = (context.watch<EventsNotifier>().items.where((e) => !e.isEnded).toList())
      ..sort((a, b) => a.date.compareTo(b.date));
    final facultyCount = context.watch<FacultyNotifier>().items.length;

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
      padding: const EdgeInsets.all(ThuieSpace.lg),
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(ThuieSpace.lg),
          decoration: BoxDecoration(
            color: c.accentWeak,
            borderRadius: BorderRadius.circular(ThuieRadii.md),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Text(L10n.hello(user.name), style: c.titleMedium),
                const SizedBox(width: 8),
                RoleBadge(role),
              ]),
              const SizedBox(height: 4),
              Text(
                switch (role) {
                  Role.student => L10n.studentAccess,
                  Role.graduate => L10n.graduateAccess,
                  _ => L10n.adminAccess,
                },
                style: TextStyle(fontSize: 12, color: c.muted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const _BannerCarousel(),
        if (upcomingEvents.isNotEmpty) ...[
        const SizedBox(height: 16),
        // Upcoming events preview
        SectionTitle(title: L10n.upcomingEvents, trailing: _ViewAll(
          onTap: () => Navigator.of(context).pushNamed(Routes.events))),
        const SizedBox(height: 8),
        SizedBox(
          height: 100,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: upcomingEvents.take(3).length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) {
              final e = upcomingEvents[i];
              return GestureDetector(
                onTap: () => Navigator.of(context).pushNamed(Routes.events),
                child: Container(
                  width: 200,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    gradient: LinearGradient(colors: eventGradient(e.type), begin: Alignment.topLeft, end: Alignment.bottomRight),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(ThuieRadii.md)),
                      child: Text(eventTypeLabel(e.type), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                    ),
                    const SizedBox(height: 6),
                    Text(e.title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    Row(children: [
                      const Icon(LucideIcons.calendar, size: 11, color: Colors.white60),
                      const SizedBox(width: 4),
                      Text('${e.date.month}/${e.date.day}', style: const TextStyle(color: Colors.white60, fontSize: 11)),
                      const SizedBox(width: 8),
                      const Icon(LucideIcons.mapPin, size: 11, color: Colors.white60),
                      const SizedBox(width: 4),
                      Flexible(child: Text(e.location, style: const TextStyle(color: Colors.white60, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ]),
                  ]),
                ),
              );
            },
          ),
        ),
        ],
        if (topProfiles.isNotEmpty) ...[
        const SizedBox(height: 16),
        SectionTitle(title: L10n.alumniSpotlight, trailing: _ViewAll(
          onTap: () => widget.onOpenTab(2))),
        const SizedBox(height: 8),
        SizedBox(
          height: 80,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: topProfiles.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) {
              final p = topProfiles[i];
              return GestureDetector(
                onTap: () => Navigator.of(context).pushNamed(Routes.alumniDetail, arguments: p.id),
                child: Container(
                  width: 160,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(ThuieRadii.md),
                    border: Border.all(color: c.hairline, width: 0.5),
                  ),
                  child: Row(
                    children: [
                      Avatar(name: p.displayName, seed: p.displayName.hashCode, size: 40, imagePath: p.avatarUrl),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(p.displayName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 2),
                            Text(p.workTitle.isNotEmpty ? p.workTitle : p.department,
                                style: TextStyle(fontSize: 12, color: c.muted), maxLines: 1, overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        ],
        const SizedBox(height: 16),
        SectionTitle(title: L10n.facultyDirectory, trailing: _ViewAll(
          onTap: () => Navigator.of(context).pushNamed(Routes.faculty))),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => Navigator.of(context).pushNamed(Routes.faculty),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(ThuieRadii.md),
              border: Border.all(color: c.hairline, width: 0.5),
            ),
            child: Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: c.bronzeWeak, borderRadius: BorderRadius.circular(ThuieRadii.lg)),
                child: Icon(LucideIcons.graduationCap, size: 20, color: c.bronze),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(L10n.facultyDirectory, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 2),
                Text('$facultyCount ${L10n.facultyDirectory}', style: TextStyle(fontSize: 12, color: c.muted)),
              ])),
              Icon(LucideIcons.chevronRight, size: 18, color: c.muted),
            ]),
          ),
        ),
        const SizedBox(height: 16),
        SectionTitle(title: L10n.forum, trailing: _ViewAll(
          onTap: () => widget.onOpenTab(3))),
        const SizedBox(height: 8),
        for (final post in posts) ...[
          _HomePostCard(post: post, onTap: () => Navigator.of(context).pushNamed(Routes.postDetail, arguments: post.id)),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 16),
      ],
    ),
    );
  }
}

class _HomePostCard extends StatelessWidget {
  final Post post;
  final VoidCallback onTap;
  const _HomePostCard({required this.post, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return InfoCard(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Avatar(name: post.authorName, seed: post.authorId.hashCode, size: 32),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(post.title, style: c.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            MetaText('${post.authorName} · ${Fmt.relative(post.createdAt)}'),
          ])),
          RoleBadge(post.authorRole),
        ]),
        const SizedBox(height: 8),
        Text(post.content, style: TextStyle(fontSize: 13, color: c.muted), maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 8),
        Row(children: [
          Icon(LucideIcons.thumbsUp, size: 13, color: c.muted),
          const SizedBox(width: 4),
          MetaText(L10n.likesCount(post.likeCount)),
          const SizedBox(width: 14),
          Icon(LucideIcons.messageCircle, size: 13, color: c.muted),
          const SizedBox(width: 4),
          MetaText(L10n.commentsCount(post.commentCount)),
        ]),
      ]),
    );
  }
}

class _ViewAll extends StatelessWidget {
  final VoidCallback onTap;
  const _ViewAll({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(ThuieRadii.md),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: Text(L10n.viewAll, style: TextStyle(color: c.accent, fontSize: 13)),
      ),
    );
  }
}

class _BannerCarousel extends StatefulWidget {
  const _BannerCarousel();
  @override
  State<_BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<_BannerCarousel> {
  final PageController _controller = PageController();
  int _currentPage = 0;
  Timer? _timer;

  static const _gradients = [
    [Color(0xFF2563EB), Color(0xFF7C3AED)],
    [Color(0xFF059669), Color(0xFF0891B2)],
    [Color(0xFFD97706), Color(0xFFDC2626)],
  ];

  List<(String, String)> get _content => [
        (L10n.bannerFairTitle, L10n.bannerFairSub),
        (L10n.bannerFoundTitle, L10n.bannerFoundSub),
        (L10n.bannerTalkTitle, L10n.bannerTalkSub),
      ];

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    final count = _content.length;
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_controller.hasClients || count == 0) return;
      final next = (_currentPage + 1) % count;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = _content;
    return SizedBox(
      height: 120,
      child: Stack(
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: items.length,
            onPageChanged: (i) {
              setState(() => _currentPage = i);
              _startTimer();
            },
            itemBuilder: (_, i) {
              final g = _gradients[i % _gradients.length];
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(ThuieRadii.md),
                  gradient: LinearGradient(colors: g, begin: Alignment.topLeft, end: Alignment.bottomRight),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(ThuieSpace.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(items[i].$1, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      Text(items[i].$2, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                ),
              );
            },
          ),
          Positioned(
            bottom: 8,
            right: 12,
            child: Row(
              children: List.generate(items.length, (i) {
                return Container(
                  width: 6, height: 6,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i == _currentPage ? Colors.white : Colors.white38,
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
