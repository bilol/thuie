import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../app_router.dart';
import '../../../data/models.dart';
import '../../../data/notifiers/forum_notifier.dart';
import '../../../data/session/auth_session.dart';
import '../../../l10n.dart';
import '../../components/common.dart';
import '../../theme/thuie_theme.dart';

class PostDetailScreen extends StatefulWidget {
  final String id;
  const PostDetailScreen(this.id, {super.key});
  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  String _newComment = '';
  Post? _post;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final notifier = context.read<ForumNotifier>();
    Post? post;
    // Wrap the whole pull so no surprise (a decode throw, an unexpected shape)
    // can strand the spinner: we must ALWAYS leave the loading state, falling
    // back to the tapped feed row when the authoritative detail fetch fails.
    // Always pull the authoritative detail row. When opened from the feed, the
    // list already holds a *partial* row (excerpt only, no full content/tags/
    // liked_by), so `byId` alone would render a truncated body — upgrade it.
    try {
      final full = await notifier.fetchOne(widget.id);
      post = full ?? notifier.byId(widget.id);
      notifier.hydrateDetail(post);
      await notifier.loadComments(widget.id);
    } catch (_) {
      post ??= notifier.byId(widget.id);
    }
    if (!mounted) return;
    setState(() {
      _post = post;
      _loading = false;
      _failed = post == null;
    });
  }

  void _retry() {
    setState(() {
      _loading = true;
      _failed = false;
    });
    _bootstrap();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = context.watch<ForumNotifier>();
    final user = context.watch<AuthSession>().user;
    final c = ThuieTheme.colorsOf(context);
    // Read the live row from the notifier so like/comment toggles repaint
    // immediately; `_post` is only the initial snapshot fallback.
    final post = notifier.byId(widget.id) ?? _post;

    if (_loading) {
      return ThuiePage(bar: ThuieBar(title: L10n.postDetail), body: const Center(child: ThuieLoader()));
    }
    // Nothing resolved (cold open + the authoritative detail fetch failed) —
    // surface a Retry instead of a dead "not found", so a transient error is
    // recoverable rather than a stuck/blank screen.
    if (_failed || post == null) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.postDetail),
        body: ResultState(
          icon: LucideIcons.wifiOff,
          title: L10n.errGeneric,
          message: L10n.postNotFound,
          actionLabel: L10n.retry,
          onAction: _retry,
        ),
      );
    }
    // Loaded but not readable by this viewer (pending / taken down) → terminal.
    if (post.status != ContentStatus.approved) {
      return ThuiePage(
        bar: ThuieBar(title: L10n.postDetail),
        body: ResultState(
          icon: LucideIcons.messagesSquare,
          title: L10n.resultUnavailable,
          message: L10n.postNotFound,
          actionLabel: L10n.goBackAction,
        ),
      );
    }

    final comments = notifier.commentsFor(widget.id);
    final liked = notifier.liked(widget.id);
    final bookmarked = notifier.bookmarked(widget.id);
    final canComment = context.read<AuthSession>().roleStrategy?.canComment ?? true;

    return ThuiePage(
      bar: ThuieBar(title: L10n.postDetail, actions: [
        ThuieIconButton(
          icon: LucideIcons.share, size: 20,
          onTap: () {
            final shareText = '${post.title}\n\n${post.content.length > 100 ? post.content.substring(0, 100) : post.content}...\n\n— THUIE App';
            Share.share(shareText, subject: post.title);
          },
        ),
        ThuieIconButton(
          icon: LucideIcons.flag, size: 20,
          onTap: () => Navigator.of(context).pushNamed(Routes.report, arguments: ('post', widget.id)),
        ),
        if (user != null && post.authorId == user.id)
          ThuieIconButton(
            icon: LucideIcons.trash2, size: 20, color: c.danger,
            onTap: () => showThuieConfirm(
              context,
              title: L10n.delete,
              body: L10n.deletePostConfirm,
              confirmLabel: L10n.delete,
              destructive: true,
              onConfirm: () async {
                final navigator = Navigator.of(context);
                final messenger = ScaffoldMessenger.of(context);
                final ok = await notifier.removePost(widget.id);
                if (ok) {
                  navigator.pop();
                  messenger.showSnackBar(
                    SnackBar(content: Text(L10n.deleted), duration: const Duration(seconds: 1)),
                  );
                }
              },
            ),
          ),
      ]),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(ThuieSpace.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(post.title, style: c.titleLarge),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => Navigator.of(context)
                .pushNamed(Routes.alumniDetail, arguments: post.authorId),
            child: Row(children: [
              Avatar(name: post.authorName, seed: post.authorId.hashCode, size: 40, imagePath: post.authorAvatarUrl),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(child: Text(post.authorName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), overflow: TextOverflow.ellipsis)),
                  const SizedBox(width: 6),
                  RoleBadge(post.authorRole),
                ]),
                const SizedBox(height: 2),
                MetaText(Fmt.relative(post.createdAt)),
              ])),
            ]),
          ),
          const SizedBox(height: 16),
          Text(post.content, style: c.bodyLarge),
          if (post.tags.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(spacing: 6, runSpacing: 4, children: post.tags.map((t) => TagChip(text: t)).toList()),
          ],
          const SizedBox(height: 16),
          Row(children: [
            GestureDetector(
              onTap: () => notifier.like(widget.id),
              child: Row(children: [
                Icon(LucideIcons.thumbsUp, size: 18, color: liked ? c.accent : c.muted),
                const SizedBox(width: 4),
                Text('${post.likeCount}', style: TextStyle(color: liked ? c.accent : c.muted, fontSize: 13)),
              ]),
            ),
            if (post.likedBy.isNotEmpty) ...[
              const SizedBox(width: 10),
              _LikerAvatars(
                likers: post.likedBy,
                overflow: post.likeCount - post.likedBy.length,
              ),
            ],
            const Spacer(),
            GestureDetector(
              onTap: () => notifier.bookmark(widget.id),
              child: Icon(bookmarked ? LucideIcons.bookmarkCheck : LucideIcons.bookmark, size: 18, color: bookmarked ? c.accent : c.muted),
            ),
          ]),
          const SizedBox(height: 20),
          const ThuieDivider(),
          const SizedBox(height: 8),
          Text(L10n.comments(comments.length), style: c.titleMedium),
          const SizedBox(height: 12),
          if (comments.isEmpty) MetaText(L10n.noCommentsYet),
          for (final root in comments) ...[
            _CommentItem(
              comment: root,
              canDelete: user != null && root.authorId == user.id,
              onDelete: () => showThuieConfirm(
                context,
                title: L10n.delete,
                body: L10n.deleteCommentConfirm,
                confirmLabel: L10n.delete,
                destructive: true,
                onConfirm: () async {
                  await notifier.deleteComment(widget.id, root.id);
                },
              ),
            ),
            const SizedBox(height: 10),
            for (final reply in root.replies) ...[
              Padding(
                padding: const EdgeInsets.only(left: 20, bottom: 10),
                child: _CommentItem(
                  comment: reply,
                  canDelete: user != null && reply.authorId == user.id,
                  onDelete: () => showThuieConfirm(
                    context,
                    title: L10n.delete,
                    body: L10n.deleteCommentConfirm,
                    confirmLabel: L10n.delete,
                    destructive: true,
                    onConfirm: () async {
                      await notifier.deleteComment(widget.id, reply.id);
                    },
                  ),
                ),
              ),
            ],
          ],
        ]),
      ),
      bottomBar: canComment
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: c.surface,
                border: Border(top: BorderSide(color: c.hairline, width: 0.5)),
              ),
              child: SafeArea(
                top: false,
                child: Row(children: [
                  Expanded(child: FlatField(
                    value: _newComment, onChanged: (v) => _newComment = v,
                    placeholder: L10n.writeCommentPlaceholder,
                  )),
                  const SizedBox(width: 8),
                  ThuieIconButton(icon: LucideIcons.sendHorizontal, size: 20, onTap: () async {
                    final text = _newComment.trim();
                    if (text.isEmpty) return;
                    final messenger = ScaffoldMessenger.of(context);
                    final created = await notifier.addComment(widget.id, text);
                    if (created == null) {
                      messenger.showSnackBar(
                        SnackBar(content: Text(L10n.actionError(notifier.error?.code)), duration: const Duration(seconds: 2)),
                      );
                      return;
                    }
                    setState(() => _newComment = '');
                    messenger.showSnackBar(
                      SnackBar(content: Text(L10n.commentSubmittedMsg), duration: const Duration(seconds: 1)),
                    );
                  }),
                ]),
              ),
            )
          : null,
    );
  }
}

class _CommentItem extends StatelessWidget {
  final Comment comment;
  final bool canDelete;
  final VoidCallback? onDelete;
  const _CommentItem({required this.comment, this.canDelete = false, this.onDelete});

  @override
  Widget build(BuildContext context) {
    final c = ThuieTheme.colorsOf(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.surfaceSunken,
        borderRadius: BorderRadius.circular(ThuieRadii.sm),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Avatar(name: comment.authorName, seed: comment.authorId.hashCode, size: 32, imagePath: comment.authorAvatarUrl),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Flexible(child: Text(comment.authorName, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13), overflow: TextOverflow.ellipsis)),
            const SizedBox(width: 6),
            RoleBadge(comment.authorRole),
            const Spacer(),
            Text(Fmt.relative(comment.createdAt), style: TextStyle(fontSize: 11, color: c.muted)),
            if (canDelete) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onDelete,
                child: Icon(LucideIcons.trash2, size: 14, color: c.muted),
              ),
            ],
          ]),
          const SizedBox(height: 6),
          Text(comment.content, style: const TextStyle(fontSize: 14)),
        ])),
      ]),
    );
  }
}

/// The up-to-3 recent-likers avatars (overlapping) plus a `+n` overflow badge,
/// mirroring the web detail's like row (§6.7 avatar stack next to the count).
class _LikerAvatars extends StatelessWidget {
  final List<PostLiker> likers;
  final int overflow;
  const _LikerAvatars({required this.likers, required this.overflow});

  @override
  Widget build(BuildContext context) {
    const diameter = 22.0;
    const step = 16.0; // 6px overlap
    final count = likers.length;
    final width = step * (count - 1) + diameter + (overflow > 0 ? 22 : 0);
    final c = ThuieTheme.colorsOf(context);
    return SizedBox(
      height: diameter,
      width: width,
      child: Stack(children: [
        for (var i = 0; i < count; i++)
          Positioned(
            left: i * step,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: c.surface, width: 1.5),
              ),
              child: Avatar(
                name: likers[i].name,
                seed: likers[i].id.hashCode,
                size: diameter,
                imagePath: likers[i].avatarUrl,
              ),
            ),
          ),
        if (overflow > 0)
          Positioned(
            left: count * step,
            child: Container(
              width: diameter,
              height: diameter,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.surfaceSunken,
                shape: BoxShape.circle,
                border: Border.all(color: c.surface, width: 1.5),
              ),
              child: Text('+$overflow', style: TextStyle(fontSize: 9, color: c.muted, fontWeight: FontWeight.w600)),
            ),
          ),
      ]),
    );
  }
}
