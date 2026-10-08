import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, ForumPost, User } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { bumpVersion } from '../../common/util/version';
import { ModerationService } from '../../moderation/services/moderation.service';
import { ReportService } from '../../moderation/services/report.service';
import { NotificationService } from '../../notifications/services/notification.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto/post.dto';

/**
 * §6.7 comments — one nesting level. Every comment denormalizes a `root_id` (its
 * top-level ancestor; equal to its own id when it IS a root), so a whole thread
 * is a single indexed fetch. Comments publish on a clean scan (§7) and bump the
 * post's `comment_count` + `last_comment_at` feed key.
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(ForumPost) private readonly posts: Repository<ForumPost>,
    private readonly moderation: ModerationService,
    private readonly reports: ReportService,
    private readonly notifications: NotificationService,
  ) {}

  async thread(postId: string, user: AuthUser) {
    const rows = await this.comments.find({
      where: { forum_post_id: postId },
      relations: { author: { avatar_media: true } },
      order: { created_at: 'ASC' },
    });
    const visible = rows.filter((c) => c.status === 'approved' || user.is_admin || c.author_id === user.id);
    const roots = visible.filter((c) => c.parent_id === null);
    const repliesByRoot = new Map<string, Comment[]>();
    for (const c of visible) {
      if (c.parent_id === null) continue;
      const rid = String(c.root_id ?? c.parent_id);
      (repliesByRoot.get(rid) ?? repliesByRoot.set(rid, []).get(rid)!).push(c);
    }
    return { data: roots.map((r) => ({ ...this.view(r), replies: (repliesByRoot.get(String(r.id)) ?? []).map((c) => this.view(c)) })) };
  }

  async create(postId: string, user: AuthUser, dto: CreateCommentDto) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw ApiException.notFound('Post not found');
    if (post.status !== 'approved' && !(user.is_admin || post.author_id === user.id)) throw ApiException.notFound('Post not found');

    const status = await this.moderation.scan([dto.content]);

    // Resolve nesting: a reply inherits its parent's root_id (flatten to one level).
    let rootId: string | null = null;
    let parent: Comment | null = null;
    if (dto.parent_id) {
      parent = await this.comments.findOne({ where: { id: dto.parent_id, forum_post_id: postId } });
      if (!parent) throw ApiException.notFound('Parent comment not found');
      rootId = String(parent.parent_id === null ? parent.id : parent.root_id ?? parent.id);
    }

    const saved = await this.comments.save(
      this.comments.create({ forum_post_id: postId, author_id: user.id, content: dto.content, status, parent_id: dto.parent_id ?? null, root_id: rootId }),
    );
    await this.moderation.record({ targetType: 'comment', targetId: saved.id, actorId: user.id, action: 'submitted' });

    if (status === 'approved') {
      await this.bumpCounts(postId, +1, true);
      if (parent && parent.author_id !== user.id) {
        // Embed the replier brief so the inbox can show who replied (avatar +
        // name) without a second round-trip, mirroring the connection notify.
        const replier = await this.comments.manager
          .getRepository(User)
          .findOne({ where: { id: user.id }, relations: { avatar_media: true } });
        await this.notifications.notify({
          recipientId: parent.author_id,
          type: 'comment_reply',
          title: 'Someone replied to your comment',
          body: dto.content.slice(0, 120),
          payload: {
            route: 'forum_post',
            targetType: 'post',
            targetId: postId,
            actor: replier ? { id: replier.id, name: replier.name, avatar_url: replier.avatar_media?.url ?? null } : null,
          },
        });
      }
    }
    const created = await this.comments.findOne({ where: { id: saved.id }, relations: { author: { avatar_media: true } } });
    return { ...this.view(created ?? saved), pending: status === 'pending' };
  }

  async update(user: AuthUser, id: string, dto: UpdateCommentDto, ifMatch?: string) {
    const c = await this.comments.findOne({ where: { id }, relations: { author: { avatar_media: true } } });
    if (!c) throw ApiException.notFound('Comment not found');
    if (!user.is_admin && c.author_id !== user.id) throw ApiException.permissionDenied('Not your comment');
    const presented = dto.version ?? (ifMatch ? Number(ifMatch.replace(/"/g, '')) : undefined);
    if (presented !== undefined && !Number.isNaN(presented) && presented !== c.version) throw ApiException.versionConflict();
    if (dto.content !== undefined) {
      c.content = dto.content;
      await this.moderation.scan([c.content]); // re-run filter; a block throws before saving
    }
    c.version = bumpVersion(c.version);
    await this.comments.save(c);
    return this.view(c);
  }

  async remove(user: AuthUser, id: string) {
    const c = await this.comments.findOne({ where: { id } });
    if (!c) throw ApiException.notFound('Comment not found');
    if (!user.is_admin && c.author_id !== user.id) throw ApiException.permissionDenied('Not your comment');
    if (c.status !== 'taken_down') {
      const wasApproved = c.status === 'approved';
      c.status = 'taken_down';
      await this.comments.save(c);
      await this.moderation.record({ targetType: 'comment', targetId: c.id, actorId: user.id, action: 'taken_down' });
      if (wasApproved) await this.bumpCounts(c.forum_post_id, -1, false);
    }
    return { taken_down: true };
  }

  report(user: AuthUser, id: string, reason: string) {
    return this.reports.create(user.id, { target_type: 'comment', target_id: id, reason });
  }

  private async bumpCounts(postId: string, delta: number, touchLastComment: boolean) {
    const set: Record<string, unknown> = { comment_count: () => `GREATEST(comment_count + ${delta}, 0)` };
    if (touchLastComment) set.last_comment_at = new Date();
    await this.posts.createQueryBuilder().update(ForumPost).set(set as any).where('id = :id', { id: postId }).execute();
  }

  private view(c: Comment) {
    const author = (c as any)?.author;
    return {
      id: c.id,
      forum_post_id: c.forum_post_id,
      parent_id: c.parent_id,
      root_id: c.root_id,
      content: c.content,
      status: c.status,
      version: c.version,
      author: author ? { id: author.id, name: author.name, role: author.role, avatar_url: author.avatar_media?.url ?? null } : null,
      created_at: c.created_at,
    };
  }
}
