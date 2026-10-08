import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Favorite, ForumPost, PostLike, PostView } from '../../entities';
import { ApiException } from '../../common/error/api.exception';
import { AuthUser } from '../../common/decorators';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { bumpVersion } from '../../common/util/version';
import { ModerationService } from '../../moderation/services/moderation.service';
import { ReportService } from '../../moderation/services/report.service';
import { TagsService } from './tags.service';
import { CreatePostDto, PostQueryDto, UpdatePostDto } from '../dto/post.dto';

type CountCol = 'like_count' | 'bookmark_count';

/**
 * Per-viewer engagement state, joined onto the post row. A counter alone cannot
 * tell the client whether *it* liked/bookmarked, so detail responses carry the
 * flags (and the recent likers behind the count) alongside the numbers.
 */
interface ViewerState {
  liked: boolean;
  bookmarked: boolean;
  /** Up to the 3 most recent likers — the avatar stack next to the like count. */
  liked_by: { id: string; name: string; role: string; avatar_url: string | null }[];
}

/**
 * §6.7 forum threads. Feeds order `is_pinned DESC, last_comment_at DESC`; the
 * counters are cache columns adjusted in the same transaction as the junction
 * toggle so a like/bookmark is one atomic op (§6.7). Non-approved posts
 * only surface to their author / admins (else `404`, §5 existence rule).
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(ForumPost) private readonly posts: Repository<ForumPost>,
    private readonly tags: TagsService,
    private readonly moderation: ModerationService,
    private readonly reports: ReportService,
  ) {}

  async feed(user: AuthUser, query: PostQueryDto) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.posts
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'author')
      .leftJoinAndSelect('author.avatar_media', 'avatar')
      .where('p.status = :approved', { approved: 'approved' });
    if (query.tag) {
      const ids = await this.tags.postIdsBySlug(query.tag);
      if (ids.length === 0) return cursorPage([], limit, null);
      qb.andWhere('p.id IN (:...ids)', { ids });
    }
    if (query.q) qb.andWhere('(p.title ILIKE :q OR p.content ILIKE :q)', { q: `%${query.q}%` });
    if (cursor?.v) {
      // keyset on (last_comment_at|created_at, id)
      qb.andWhere('(COALESCE(p.last_comment_at, p.created_at), p.id) < (:cv, :cid)', {
        cv: new Date(String(cursor.v)),
        cid: String(cursor.id ?? '0'),
      });
    }
    qb.orderBy('p.is_pinned', 'DESC')
      // The COALESCE string is emitted as raw SQL; `.limit` (not `.take`) avoids
      // TypeORM's distinct-ids subquery which cannot resolve a COALESCE "alias".
      .addOrderBy('COALESCE(p.last_comment_at, p.created_at)', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .limit(limit + 1);
    const rows = await qb.getMany();
    const last = rows[limit - 1];
    const next =
      rows.length > limit && last ? encodeCursor({ v: (last.last_comment_at ?? last.created_at).toISOString(), id: last.id }) : null;
    const page = rows.slice(0, limit);
    const flags = await this.viewerFlags(user, page.map((p) => p.id));
    return cursorPage(
      page.map((p) => {
        const f = flags.get(p.id);
        return this.row(p, false, undefined, f ? { ...f, liked_by: [] } : undefined);
      }),
      limit,
      next,
    );
  }

  async findOne(user: AuthUser, id: string) {
    const p = await this.load(id);
    if (p.status !== 'approved' && !(user.is_admin || p.author_id === user.id)) throw ApiException.notFound('Post not found');
    await this.recordView(id, user);
    return this.row(p, true, await this.tags.tagsForPost(id), await this.viewerState(id, user.id));
  }

  async create(user: AuthUser, dto: CreatePostDto) {
    const status = await this.moderation.scan([dto.title, dto.content]);
    const saved = await this.posts.save(
      this.posts.create({
        title: dto.title,
        content: dto.content,
        location: dto.location ?? null,
        status,
        author_id: user.id,
        approved_at: status === 'approved' ? new Date() : null,
      }),
    );
    await this.tags.setForPost(saved.id, dto.tags ?? []);
    await this.moderation.record({ targetType: 'forum_post', targetId: saved.id, actorId: user.id, action: 'submitted' });
    return this.row(await this.load(saved.id), true, await this.tags.tagsForPost(saved.id));
  }

  async update(user: AuthUser, id: string, dto: UpdatePostDto, ifMatch?: string) {
    const p = await this.load(id);
    if (!user.is_admin && p.author_id !== user.id) throw ApiException.permissionDenied('Not your post');
    const presented = dto.version ?? (ifMatch ? Number(ifMatch.replace(/"/g, '')) : undefined);
    if (p.status === 'taken_down') throw ApiException.notFound('Post not found');
    if (presented !== undefined && !Number.isNaN(presented) && presented !== p.version) {
      throw ApiException.versionConflict(`Post is at version ${p.version}, request assumed ${presented}`);
    }
    if (dto.title !== undefined) p.title = dto.title;
    if (dto.content !== undefined) p.content = dto.content;
    if (dto.location !== undefined) p.location = dto.location;

    if (dto.title !== undefined || dto.content !== undefined) {
      const scanned = await this.moderation.scan([p.title, p.content]);
      if (p.status === 'approved') p.edited_at = new Date();
      if (scanned === 'pending') {
        p.status = 'pending';
        p.reject_reason = null;
        await this.moderation.record({ targetType: 'forum_post', targetId: p.id, actorId: user.id, action: 'resubmitted' });
      }
    }
    if (dto.tags !== undefined) await this.tags.setForPost(p.id, dto.tags);
    p.version = bumpVersion(p.version);
    await this.posts.save(p);
    return this.row(p, true, await this.tags.tagsForPost(p.id));
  }

  async remove(user: AuthUser, id: string) {
    const p = await this.posts.findOne({ where: { id } });
    if (!p) throw ApiException.notFound();
    if (!user.is_admin && p.author_id !== user.id) throw ApiException.permissionDenied('Not your post');
    if (p.status !== 'taken_down') {
      p.status = 'taken_down';
      p.taken_down_at = new Date();
      await this.posts.save(p);
      await this.moderation.record({ targetType: 'forum_post', targetId: p.id, actorId: user.id, action: 'taken_down' });
    }
    return { taken_down: true };
  }

  report(user: AuthUser, id: string, reason: string) {
    return this.reports.create(user.id, { target_type: 'forum_post', target_id: id, reason });
  }

  // ------------------------------------------------------- toggles (§6.7) --

  like(user: AuthUser, id: string) {
    return this.toggle(user.id, id, PostLike, 'like_count');
  }

  bookmark(user: AuthUser, id: string) {
    return this.toggle(user.id, id, Favorite, 'bookmark_count');
  }

  /**
   * One junction toggle + counter delta in a single transaction. `entity` is the
   * junction class; `favorites` is keyed by (user_id,target_type,target_id) while
   * likes are keyed by (post_id,user_id), so the lookup/create branches on
   * which one we're toggling.
   */
  private async toggle(userId: string, postId: string, entity: any, column: CountCol) {
    const isFavorite = entity === Favorite;
    const active = await this.posts.manager.transaction(async (m: EntityManager) => {
      const repo = m.getRepository(entity);
      const where = isFavorite ? { user_id: userId, target_type: 'post', target_id: postId } : { post_id: postId, user_id: userId };
      const existing = await repo.findOne({ where: where as any });
      if (existing) {
        await repo.remove(existing);
      } else {
        await repo.save(repo.create(where as any));
      }
      const delta = existing ? -1 : 1;
      await m
        .createQueryBuilder()
        .update(ForumPost)
        .set({ [column]: () => `GREATEST(${column} + ${delta}, 0)` } as any)
        .where('id = :id', { id: postId })
        .execute();
      return !existing;
    });
    // Superset response: the fresh post row (what openapi documents and what the
    // web client patches its cache from) plus the `active`/`count` convenience
    // pair the mobile list rows fold into their local membership set.
    const fresh = await this.load(postId);
    const count = Number(fresh[column] ?? 0);
    return {
      ...this.row(fresh, true, await this.tags.tagsForPost(postId), await this.viewerState(postId, userId)),
      active,
      count,
    };
  }

  /**
   * One batched membership probe for a whole feed page — three `IN` queries
   * regardless of page size, never one per row (the note under `row` rules that
   * out). Cards need the viewer's own liked/bookmarked flags, which the bare
   * counters can't convey, so the browse feed can finally render its like button
   * in the right state without opening each thread.
   */
  private async viewerFlags(
    user: AuthUser,
    ids: string[],
  ): Promise<Map<string, { liked: boolean; bookmarked: boolean }>> {
    const map = new Map<string, { liked: boolean; bookmarked: boolean }>();
    if (!user?.id || ids.length === 0) return map;
    const m = this.posts.manager;
    const [likes, marks] = await Promise.all([
      m.getRepository(PostLike).find({ where: { user_id: user.id, post_id: In(ids) }, select: { post_id: true } }),
      m.getRepository(Favorite).find({ where: { user_id: user.id, target_type: 'post', target_id: In(ids) }, select: { target_id: true } }),
    ]);
    const ensure = (id: string) => {
      let f = map.get(id);
      if (!f) {
        f = { liked: false, bookmarked: false };
        map.set(id, f);
      }
      return f;
    };
    likes.forEach((l) => (ensure(l.post_id).liked = true));
    marks.forEach((fav) => (ensure(fav.target_id).bookmarked = true));
    return map;
  }

  /** Three independent existence probes + the recent-likers page, in one round. */
  private async viewerState(postId: string, userId: string): Promise<ViewerState> {
    const m = this.posts.manager;
    const [liked, bookmarked, likers] = await Promise.all([
      m.getRepository(PostLike).findOne({ where: { post_id: postId, user_id: userId } }),
      m.getRepository(Favorite).findOne({ where: { user_id: userId, target_type: 'post', target_id: postId } }),
      m.getRepository(PostLike).find({
        where: { post_id: postId },
        relations: { user: { avatar_media: true } },
        order: { created_at: 'DESC' },
        take: 3,
      }),
    ]);
    return {
      liked: !!liked,
      bookmarked: !!bookmarked,
      liked_by: likers
        .filter((l) => !!l.user)
        .map((l) => ({
          id: l.user.id,
          name: l.user.name,
          role: l.user.role,
          avatar_url: l.user.avatar_media?.url ?? null,
        })),
    };
  }

  /** Idempotent per-viewer view counter (§6.8). */
  private async recordView(postId: string, user: AuthUser) {
    const repo = this.posts.manager.getRepository(PostView);
    const seen = await repo.findOne({ where: { post_id: postId, user_id: user.id } });
    if (seen) return;
    await repo.save(repo.create({ post_id: postId, user_id: user.id }));
    await this.posts.createQueryBuilder().update(ForumPost).set({ view_count: () => 'view_count + 1' } as any).where('id = :id', { id: postId }).execute();
  }

  private async load(id: string): Promise<ForumPost> {
    const p = await this.posts.findOne({ where: { id }, relations: { author: { avatar_media: true } } });
    if (!p) throw ApiException.notFound('Post not found');
    return p;
  }

  private row(
    p: ForumPost,
    full: boolean,
    tags?: { id: string; name: string; slug: string }[],
    // Feeds skip the viewer state on purpose: the cards render counters only, and
    // probing per row would add N round-trips to every page load.
    viewer?: ViewerState,
  ) {
    const author = (p as any).author;
    return {
      id: p.id,
      title: p.title,
      excerpt: p.content.slice(0, 200),
      author: author ? { id: author.id, name: author.name, role: author.role, avatar_url: author.avatar_media?.url ?? null } : null,
      is_pinned: p.is_pinned,
      location: p.location,
      view_count: p.view_count,
      like_count: p.like_count,
      bookmark_count: p.bookmark_count,
      comment_count: p.comment_count,
      last_comment_at: p.last_comment_at,
      status: p.status,
      reject_reason: p.reject_reason,
      edited_at: p.edited_at,
      version: p.version,
      created_at: p.created_at,
      liked: viewer?.liked ?? false,
      bookmarked: viewer?.bookmarked ?? false,
      ...(tags ? { tags } : {}),
      ...(viewer ? { liked_by: viewer.liked_by } : {}),
      ...(full ? { content: p.content } : {}),
    };
  }
}
