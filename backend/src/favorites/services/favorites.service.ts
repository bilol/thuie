import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities';
import { TargetType } from '../../common/auth.types';
import { clampLimit, decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { cursorPage } from '../../common/pagination/page';
import { NO_TARGET_META, TargetMetaService } from './target-meta.service';

/**
 * §6.12 favorites (bookmarks). Keyed by the polymorphic (target_type, target_id)
 * pair the client already uses, so one surface spans infos / posts / profiles /
 * comments. Adds are idempotent (composite PK); forum post bookmarks toggle the
 * same row inside the §6.7 counter transaction.
 */
@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
    private readonly targetMeta: TargetMetaService,
  ) {}

  async list(userId: string, query: { type?: TargetType; cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const cursor = decodeCursor(query.cursor);
    const qb = this.favorites.createQueryBuilder('f').where('f.user_id = :userId', { userId });
    if (query.type) qb.andWhere('f.target_type = :type', { type: query.type });
    if (cursor?.v) qb.andWhere('f.created_at < :c', { c: new Date(String(cursor.v)) });
    const rows = await qb.orderBy('f.created_at', 'DESC').addOrderBy('f.target_id', 'DESC').take(limit + 1).getMany();
    const last = rows[limit - 1];
    const next = rows.length > limit && last ? encodeCursor({ v: last.created_at.toISOString(), id: last.target_id }) : null;
    const page = rows.slice(0, limit);
    /* One batched lookup for the whole page, so a list of bookmarks reads as the
       things the user actually saved instead of a column of type labels. */
    const metas = await this.targetMeta.resolve(page);
    return cursorPage(
      page.map((f) => ({
        target_type: f.target_type,
        target_id: f.target_id,
        created_at: f.created_at,
        ...(metas.get(`${f.target_type}:${f.target_id}`) ?? NO_TARGET_META),
      })),
      limit,
      next,
    );
  }

  /** Idempotent add — a repeat insert over the composite PK is a no-op (§6.11). */
  async add(userId: string, input: { target_type: TargetType; target_id: string }) {
    await this.favorites.upsert(
      { user_id: userId, target_type: input.target_type, target_id: input.target_id },
      { conflictPaths: ['user_id', 'target_type', 'target_id'] },
    );
    return { bookmarked: true };
  }

  async remove(userId: string, input: { target_type: TargetType; target_id: string }) {
    await this.favorites.delete({ user_id: userId, target_type: input.target_type, target_id: input.target_id });
    return { bookmarked: false };
  }

  /** Batch existence probe so the client can paint bookmark icons in one round-trip. */
  async status(userId: string, targets: Array<{ target_type: TargetType; target_id: string }>) {
    if (targets.length === 0) return {};
    const rows = await this.favorites.find({ where: targets.map((t) => ({ user_id: userId, ...t })) });
    const set = new Set(rows.map((r) => `${r.target_type}:${r.target_id}`));
    return targets.reduce<Record<string, boolean>>((acc, t) => {
      acc[`${t.target_type}:${t.target_id}`] = set.has(`${t.target_type}:${t.target_id}`);
      return acc;
    }, {});
  }
}
