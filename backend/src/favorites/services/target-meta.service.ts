import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AlumniProfile, Comment, ForumPost, InfoPost } from '../../entities';
import { TargetType } from '../../common/auth.types';

/** The words a polymorphic `(target_type, target_id)` row needs to be listable. */
export interface TargetMeta {
  title: string | null;
  subtitle: string | null;
}

/**
 * Returned when the target is gone or no longer readable. The rows keep their
 * keys so the client can still offer "remove" — it just cannot name the thing.
 */
export const NO_TARGET_META: TargetMeta = { title: null, subtitle: null };

/** One-line preview: a list row is not the article. */
function excerpt(text: string, max = 90): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Favorites (§6.12) are stored as bare `(target_type, target_id)`
 * pairs, so `GET /favorites` returns a list of type labels with nothing to
 * recognise — the Flutter client papers over this with a per-row lookup
 * (`lib/ui/components/target_title.dart`) that still cannot name profiles or
 * comments. Resolving it here, once, fixes both clients.
 *
 * One query per *type group*, never per row. Only `approved` targets are named: a
 * saved row can outlive its target (takedown, rejection, a profile pulled back to
 * draft), and echoing the title of something the reader can no longer open would
 * leak it.
 */
@Injectable()
export class TargetMetaService {
  constructor(
    @InjectRepository(InfoPost) private readonly infos: Repository<InfoPost>,
    @InjectRepository(ForumPost) private readonly posts: Repository<ForumPost>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(AlumniProfile) private readonly profiles: Repository<AlumniProfile>,
  ) {}

  /** keyed `${target_type}:${target_id}` → meta; absent keys mean unavailable. */
  async resolve(
    rows: readonly { target_type: TargetType; target_id: string }[],
  ): Promise<Map<string, TargetMeta>> {
    const out = new Map<string, TargetMeta>();
    if (rows.length === 0) return out;
    const idsOf = (type: TargetType) =>
      rows.filter((r) => r.target_type === type).map((r) => r.target_id);

    const infoIds = idsOf('info');
    if (infoIds.length) {
      const found = await this.infos.find({
        where: { id: In(infoIds), status: 'approved' },
        select: ['id', 'title', 'content'],
      });
      for (const i of found) out.set(`info:${i.id}`, { title: i.title, subtitle: excerpt(i.content) });
    }

    const postIds = idsOf('post');
    if (postIds.length) {
      const found = await this.posts.find({
        where: { id: In(postIds), status: 'approved' },
        select: ['id', 'title', 'content'],
      });
      for (const p of found) out.set(`post:${p.id}`, { title: p.title, subtitle: excerpt(p.content) });
    }

    // Comments have no title column — the opening of the body is the only thing
    // that identifies them, and there is no second line to show.
    const commentIds = idsOf('comment');
    if (commentIds.length) {
      const found = await this.comments.find({
        where: { id: In(commentIds), status: 'approved' },
        select: ['id', 'content'],
      });
      for (const c of found) out.set(`comment:${c.id}`, { title: excerpt(c.content, 60), subtitle: null });
    }

    const profileIds = idsOf('profile');
    if (profileIds.length) {
      const found = await this.profiles.find({
        where: { id: In(profileIds), status: 'approved' },
        select: ['id', 'display_name', 'work_title', 'company'],
      });
      for (const p of found) {
        out.set(`profile:${p.id}`, {
          title: p.display_name,
          subtitle: [p.work_title, p.company].filter(Boolean).join(' · ') || null,
        });
      }
    }

    return out;
  }

  /** Single-row form of {@link resolve} (same guarantees, one extra round-trip). */
  async one(target_type: TargetType, target_id: string): Promise<TargetMeta> {
    const metas = await this.resolve([{ target_type, target_id }]);
    return metas.get(`${target_type}:${target_id}`) ?? NO_TARGET_META;
  }
}
